# FasalAI — Crop Disease Detection System 🌾

FasalAI is an AI-powered agricultural diagnostic tool designed to help farmers identify crop diseases instantly using machine learning. The system supports multiple classifiers (CNN, SVM, KNN, ResNet50, EfficientNetB0) and provides detailed treatment plans and weather risk analysis.

## 🚀 Features
- **Multi-Model Detection:** Compare results from CNN, SVM, KNN, ResNet50, and EfficientNetB0.
- **Real-time Analysis:** Instant disease identification from leaf images.
- **Smart Treatment Plans:** Generates 7-day action plans and chemical/organic remedies.
- **Weather Integration:** Assesses disease spread risk based on local humidity and temperature.
- **Cloud History:** Securely saves all predictions to MongoDB Atlas.
- **PDF Reports:** Downloadable professional diagnostic reports.
- **Modern Dashboard:** Visualize model performance metrics with Chart.js.

## 🛠️ Tech Stack
- **Frontend:** React.js, Vite, Chart.js, Vanilla CSS.
- **Backend:** Flask, TensorFlow, Scikit-learn, MongoDB Atlas, ReportLab.
- **Dataset:** PlantVillage (Tomato, Pepper, etc.)

## 📂 Project Structure
```text
backend/
├── app.py                 # Flask API
├── database/              # MongoDB integration
├── models/                # Saved models & metrics
├── reports/               # PDF generation logic
└── train_new_models.py    # Training script for ResNet50/EffNet
frontend/
├── src/
│   ├── App.jsx           # Main Application UI
│   └── index.css         # Styling & Design System
└── ...
```

## ⚙️ Setup Instructions

### Backend
1. Navigate to `backend/`.
2. Create a virtual environment: `python -m venv .venv`.
3. Install dependencies: `pip install flask flask-cors tensorflow scikit-learn pymongo reportlab opencv-python joblib`.
4. Update MongoDB Atlas URI in `database/mongo.py`.
5. Run the server: `python app.py`.

### Frontend
1. Navigate to `frontend/`.
2. Install dependencies: `npm install`.
3. Run the development server: `npm run dev`.

---
Built with ❤️ for Pakistani Farmers.
