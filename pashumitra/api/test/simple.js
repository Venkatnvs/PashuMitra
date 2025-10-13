// Simple test function to verify Vercel deployment
module.exports = async function handler(req, res) {
  console.log('Simple test function called');
  
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('Environment check...');
    
    // Check if we have any environment variables
    const envVars = {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      EMAIL_HOST: !!process.env.EMAIL_HOST,
      EMAIL_PORT: !!process.env.EMAIL_PORT,
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASS: !!process.env.EMAIL_PASS,
      NOTIFICATION_EMAIL: !!process.env.NOTIFICATION_EMAIL,
      SEND_FROM_EMAIL: !!process.env.SEND_FROM_EMAIL
    };
    
    console.log('Environment variables status:', envVars);
    
    res.status(200).json({
      success: true,
      message: 'Simple test function working',
      timestamp: new Date().toISOString(),
      environment: envVars,
      nodeVersion: process.version
    });
    
  } catch (error) {
    console.error('Simple test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
