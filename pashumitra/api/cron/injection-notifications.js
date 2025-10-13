// Vercel serverless function for injection notifications
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: 'https://pashu-mitra-897fa-default-rtdb.asia-southeast1.firebasedatabase.app/'
  });
}

const db = getDatabase();

// Email transporter setup
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to get all cattle
async function getAllCattle() {
  try {
    const snapshot = await db.ref('cattles').once('value');
    const data = snapshot.val() || {};
    return Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
  } catch (error) {
    console.error('Error fetching cattle:', error);
    throw error;
  }
}

// Helper function to get all events for a cattle
async function getAllEvents(cattleId) {
  try {
    const snapshot = await db.ref(`cattles/${cattleId}/events`).once('value');
    const data = snapshot.val() || {};
    return Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

// Helper function to get sent notifications
async function getSentNotifications() {
  try {
    const snapshot = await db.ref('notifications/sent').once('value');
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error fetching sent notifications:', error);
    return {};
  }
}

// Helper function to mark notification as sent
async function markNotificationSent(cattleId, eventId, occurrenceDate) {
  try {
    const notificationKey = `${cattleId}_${eventId}_${occurrenceDate}`;
    await db.ref(`notifications/sent/${notificationKey}`).set({
      cattleId,
      eventId,
      occurrenceDate,
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error marking notification as sent:', error);
  }
}

// Helper function to calculate next injection dates
function calculateNextInjectionDates(event) {
  if (!event.isRepeated || !event.isInjection) return [];

  const dates = [];
  let nextDate = new Date(event.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate occurrences for the next 30 days
  for (let i = 0; i < 30; i++) {
    const occurrenceDate = new Date(nextDate);
    occurrenceDate.setHours(0, 0, 0, 0);

    if (occurrenceDate >= today) {
      // Check if this occurrence is not completed
      const isCompleted = event.completedTill && 
        new Date(occurrenceDate) <= new Date(event.completedTill);
      
      if (!isCompleted) {
        dates.push(occurrenceDate.toISOString());
      }
    }

    nextDate.setDate(nextDate.getDate() + (event.repeatDuration || 1));
  }

  return dates;
}

// Helper function to send email notification
async function sendEmailNotification(cattle, event, injectionDate) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: `Injection Reminder: ${cattle.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🐄 Injection Reminder</h2>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Cattle Details:</h3>
            <p><strong>Name:</strong> ${cattle.name}</p>
            <p><strong>Type:</strong> ${cattle.type}</p>
            <p><strong>Injection Date:</strong> ${new Date(injectionDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            ${event.note ? `<p><strong>Note:</strong> ${event.note}</p>` : ''}
          </div>
          <p style="color: #64748b; font-size: 14px;">
            This is an automated reminder from PashuMitra cattle management system.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent for ${cattle.name} - ${injectionDate}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Main function to check and send injection notifications
async function checkAndSendInjectionNotifications() {
  try {
    console.log('Starting injection notification check...');
    
    const cattle = await getAllCattle();
    const sentNotifications = await getSentNotifications();
    
    let notificationsSent = 0;
    
    for (const cattleItem of cattle) {
      const events = await getAllEvents(cattleItem.id);
      const injectionEvents = events.filter(e => e.isInjection && e.isRepeated);
      
      for (const event of injectionEvents) {
        const nextDates = calculateNextInjectionDates(event);
        
        for (const injectionDate of nextDates) {
          const notificationKey = `${cattleItem.id}_${event.id}_${injectionDate}`;
          
          // Check if notification already sent
          if (sentNotifications[notificationKey]) {
            continue;
          }
          
          // Check if injection is due today or tomorrow
          const injectionDateTime = new Date(injectionDate);
          const today = new Date();
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const isDueToday = injectionDateTime.toDateString() === today.toDateString();
          const isDueTomorrow = injectionDateTime.toDateString() === tomorrow.toDateString();
          
          if (isDueToday || isDueTomorrow) {
            const emailSent = await sendEmailNotification(cattleItem, event, injectionDate);
            
            if (emailSent) {
              await markNotificationSent(cattleItem.id, event.id, injectionDate);
              notificationsSent++;
            }
          }
        }
      }
    }
    
    console.log(`Injection notification check completed. ${notificationsSent} notifications sent.`);
    return { success: true, notificationsSent };
    
  } catch (error) {
    console.error('Error in injection notification check:', error);
    return { success: false, error: error.message };
  }
}

// Vercel serverless function handler
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests for cron
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await checkAndSendInjectionNotifications();
    res.status(200).json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
