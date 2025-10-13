// Simple test script for manual cron trigger
// Run with: node test-cron.js

const https = require('https');

// Replace with your actual Vercel URL
const VERCEL_URL = 'https://your-app.vercel.app';

function testCronJob() {
  const url = `${VERCEL_URL}/api/cron/injection-notifications`;
  
  console.log('Testing cron job...');
  console.log('URL:', url);
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log('✅ Success! Notifications sent:', response.notificationsSent);
        } else {
          console.log('❌ Error:', response.error);
        }
      } catch (e) {
        console.log('❌ Invalid JSON response');
      }
    });
  }).on('error', (err) => {
    console.log('❌ Request failed:', err.message);
  });
}

// Run the test
testCronJob();
