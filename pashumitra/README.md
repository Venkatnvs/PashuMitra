# PashuMitra - Cattle Management Dashboard

A comprehensive cattle management dashboard with AI-powered disease detection capabilities.

## Features

### 🐄 Cattle Management
- Add, edit, and manage cattle records
- Track cattle details and health information
- Monitor injection schedules

### 🔬 AI Disease Detection
- **Camera Capture**: Take photos directly from your device camera
- **Image Upload**: Upload existing images for analysis
- **Gemini AI Integration**: Advanced AI analysis for disease detection
- **Real-time Results**: Get instant disease detection with confidence scores
- **Treatment Recommendations**: AI-powered treatment suggestions
- **History Management**: View and manage all detection records

### 📊 Dashboard Features
- Real-time data visualization
- Responsive design for mobile and desktop
- Firebase integration for data persistence
- Modern UI with shadcn/ui components

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Gemini AI API
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pashumitra
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy the `.env.example` file to `.env`
   - Fill in your Firebase and Gemini API credentials

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## Disease Detection Workflow

1. **Select Cattle**: Choose the cattle you want to analyze
2. **Capture/Upload Image**: Use camera or upload an existing image
3. **AI Analysis**: The system sends the image to Gemini AI for analysis
4. **Get Results**: Receive detailed disease detection with:
   - Disease name and confidence score
   - Severity level (Low/Medium/High)
   - Symptoms list
   - Treatment recommendations
   - Action items
5. **Save to Database**: Results are automatically saved to Firebase
6. **View History**: Access all previous detections with delete functionality

## Supported Diseases

The AI model is trained to detect common cattle diseases including:
- Foot and Mouth Disease
- Bovine Respiratory Disease
- Mastitis
- Bovine Viral Diarrhea
- Blackleg
- Anthrax
- Brucellosis
- Tuberculosis

## Tech Stack

- **Frontend**: React + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Database**: Firebase Realtime Database
- **AI**: Google Gemini Pro Vision API
- **Icons**: Lucide React
- **Notifications**: Sonner

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
