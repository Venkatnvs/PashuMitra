# PashuMitra Server

Backend server for PashuMitra cattle management system with automated injection notifications.

## Features

- **Automated Injection Notifications**: Checks injection schedules every 15 minutes
- **Email Notifications**: Sends email reminders for upcoming injections
- **Persistence**: Tracks sent notifications to prevent duplicates
- **Manual Triggers**: API endpoints for manual testing and external cron services
- **Firebase Integration**: Connects to Firebase Realtime Database

## Setup

1. **Install dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   - Firebase Admin credentials
   - Email SMTP settings
   - Notification email address

3. **Get Firebase Admin Credentials**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate a new private key
   - Copy the credentials to your `.env` file

4. **Configure Email Settings**
   - For Gmail: Use App Password (not regular password)
   - Enable 2-factor authentication
   - Generate App Password in Google Account settings

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Manual Trigger
```
POST /api/trigger/injection-notifications
```

### Cron Endpoint (for external cron services)
```
GET /api/cron/injection-notifications
```

## Cron Job Configuration

The server includes a built-in cron job that runs every 15 minutes. You can also use external cron services:

### Using External Cron Service (Recommended for Production)

1. **Vercel Cron Jobs**
   ```bash
   # Add to vercel.json
   {
     "crons": [
       {
         "path": "/api/cron/injection-notifications",
         "schedule": "*/15 * * * *"
       }
     ]
   }
   ```

2. **GitHub Actions**
   ```yaml
   name: Injection Notifications
   on:
     schedule:
       - cron: '*/15 * * * *'
   jobs:
     notify:
       runs-on: ubuntu-latest
       steps:
         - name: Trigger notifications
           run: curl -X GET ${{ secrets.SERVER_URL }}/api/cron/injection-notifications
   ```

3. **Traditional Cron**
   ```bash
   # Add to crontab
   */15 * * * * curl -X GET http://your-server.com/api/cron/injection-notifications
   ```

## Environment Variables

```env
# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
NOTIFICATION_EMAIL=recipient@example.com

# Server Configuration
PORT=3001
NODE_ENV=development
```

## How It Works

1. **Data Collection**: Fetches all cattle and their injection events from Firebase
2. **Schedule Calculation**: Calculates upcoming injection dates for recurring injections
3. **Notification Check**: Determines if injections are due today or tomorrow
4. **Duplicate Prevention**: Checks against sent notifications to avoid duplicates
5. **Email Sending**: Sends formatted email notifications
6. **Persistence**: Marks notifications as sent in Firebase

## Notification Logic

- **Triggers**: Injections due today or tomorrow
- **Frequency**: Checks every 15 minutes
- **Persistence**: Tracks sent notifications to prevent duplicates
- **Scope**: Only recurring injection events (`isInjection: true, isRepeated: true`)

## Troubleshooting

### Email Not Sending
- Check SMTP credentials
- Verify App Password for Gmail
- Check firewall/network restrictions

### Firebase Connection Issues
- Verify service account credentials
- Check database rules
- Ensure project ID is correct

### Cron Not Running
- Check server logs
- Verify cron schedule syntax
- Test manual trigger endpoint

## Development

### Testing
```bash
# Test manual trigger
curl -X POST http://localhost:3001/api/trigger/injection-notifications

# Check health
curl http://localhost:3001/api/health
```

### Logs
The server logs all activities including:
- Cron job executions
- Email sending attempts
- Error messages
- Notification counts
