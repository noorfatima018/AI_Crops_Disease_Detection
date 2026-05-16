from flask import Flask, request, jsonify # type: ignore
from flask_cors import CORS # type: ignore
from PIL import Image # type: ignore
import numpy as np # type: ignore
import io
import time
import os
import json
from flask import send_file

# Try to import TensorFlow for the real model
try:
    import tensorflow as tf # type: ignore
    from tensorflow.keras.models import load_model # type: ignore
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("TensorFlow not found. Falling back to simulation mode.")
    
try:
    from database.mongo import insert_prediction, get_all_predictions, delete_prediction, clear_all_history
    from reports.report_generator import generate_pdf_report
    HAS_DB = True
except ImportError as e:
    HAS_DB = False
    print(f"Database/Reports modules not found: {e}")

try:
    import joblib
    HAS_JOBLIB = True
except ImportError:
    HAS_JOBLIB = False
    print("Joblib not found. Traditional ML models won't load.")
    
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    print("cv2 not found. Traditional ML models won't load.")

app = Flask(__name__)
CORS(app)

# --- MODEL SETTINGS ---
MODEL_PATH = 'leaf_disease_cnn_model.h5'
# The classes your model was trained on (in alphabetical order)
# Example: ['Early Blight', 'Healthy']
CLASS_NAMES = ['early_blight', 'healthy'] 

model = None
svm_model = None
knn_model = None
resnet_model = None
efficientnet_model = None
best_model = None
ml_classes = ['bacterial_spot', 'healthy']

if HAS_TF:
    if os.path.exists(MODEL_PATH):
        try:
            model = load_model(MODEL_PATH)
            print(f"Successfully loaded real CNN model from {MODEL_PATH}")
        except Exception as e:
            pass
            
    # Load new models if they exist
    try:
        if os.path.exists('models/resnet50_model.h5'):
            resnet_model = load_model('models/resnet50_model.h5')
        if os.path.exists('models/efficientnetb0_model.h5'):
            efficientnet_model = load_model('models/efficientnetb0_model.h5')
        if os.path.exists('models/best_model.h5'):
            best_model = load_model('models/best_model.h5')
    except Exception as e:
        print(f"Error loading new models: {e}")

if HAS_JOBLIB:
    if os.path.exists('svm_model.pkl'):
        try:
            svm_model = joblib.load('svm_model.pkl')
            print("Successfully loaded SVM model")
        except Exception as e: pass
        
    if os.path.exists('knn_model.pkl'):
        try:
            knn_model = joblib.load('knn_model.pkl')
            print("Successfully loaded KNN model")
        except Exception as e: pass
        
    if os.path.exists('ml_classes.pkl'):
        try:
            ml_classes = joblib.load('ml_classes.pkl')
        except Exception as e: pass

def preprocess_image(image):
    """
    Prepares the image exactly how your CNN needs it (224x224, normalized)
    """
    img = image.resize((224, 224))
    img_array = np.array(img) / 255.0  # Normalize to [0,1]
    img_array = np.expand_dims(img_array, axis=0) # Add batch dimension
    return img_array

def preprocess_for_ml(image):
    """
    Prepares the image for SVM/KNN (64x64, flattened)
    """
    img = np.array(image)
    if len(img.shape) == 3 and img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
    img = cv2.resize(img, (64, 64))
    img_flat = img.flatten() / 255.0
    return np.expand_dims(img_flat, axis=0)

def simulated_classify(image):
    """
    Fallback logic if the model file is missing or TF is not installed.
    Analyzes RGB averages.
    """
    img = image.resize((100, 100)).convert('RGB')
    img_array = np.array(img)
    avg_r = np.mean(img_array[:, :, 0])
    avg_g = np.mean(img_array[:, :, 1])
    avg_b = np.mean(img_array[:, :, 2])
    
    green_ratio = avg_g / (avg_r + avg_g + avg_b + 1)
    if green_ratio > 0.40:
        return 'healthy', round(float(85 + (green_ratio * 10)), 2)
    else:
        return 'bacterial_spot', round(float(80 + (avg_r/255 * 15)), 2)

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    algo = request.form.get('algorithm', 'cnn')
    
    try:
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        algorithm_used = 'Simulation'
        predicted_id = 'healthy'
        confidence = 50.0

        if algo == 'svm' and svm_model:
            print(f"Using SVM Model to predict {file.filename}...")
            processed_img = preprocess_for_ml(image)
            prediction = svm_model.predict(processed_img)[0]
            probs = svm_model.predict_proba(processed_img)[0]
            
            predicted_id = ml_classes[prediction]
            confidence = float(np.max(probs) * 100)
            algorithm_used = 'Support Vector Machine (SVM)'
            time.sleep(0.5)

        elif algo == 'knn' and knn_model:
            print(f"Using KNN Model to predict {file.filename}...")
            processed_img = preprocess_for_ml(image)
            prediction = knn_model.predict(processed_img)[0]
            probs = knn_model.predict_proba(processed_img)[0]
            
            predicted_id = ml_classes[prediction]
            confidence = float(np.max(probs) * 100)
            algorithm_used = 'K-Nearest Neighbors (KNN)'
            time.sleep(0.5)
            
        elif algo == 'cnn' and model:
            print(f"Using REAL CNN Model to predict {file.filename}...")
            processed_img = preprocess_image(image)
            prediction = model.predict(processed_img)
            
            pred_idx = np.argmax(prediction[0])
            confidence = float(np.max(prediction[0]) * 100)
            predicted_id = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else CLASS_NAMES[0]
            algorithm_used = 'Neural Network (CNN)'
            time.sleep(1)
        elif algo == 'resnet50' and resnet_model:
            print(f"Using ResNet50 Model to predict {file.filename}...")
            processed_img = preprocess_image(image)
            prediction = resnet_model.predict(processed_img)
            pred_idx = np.argmax(prediction[0])
            confidence = float(np.max(prediction[0]) * 100)
            predicted_id = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else CLASS_NAMES[0]
            algorithm_used = 'ResNet50'
            time.sleep(1)
            
        elif algo == 'efficientnetb0' and efficientnet_model:
            print(f"Using EfficientNetB0 Model to predict {file.filename}...")
            processed_img = preprocess_image(image)
            prediction = efficientnet_model.predict(processed_img)
            pred_idx = np.argmax(prediction[0])
            confidence = float(np.max(prediction[0]) * 100)
            predicted_id = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else CLASS_NAMES[0]
            algorithm_used = 'EfficientNetB0'
            time.sleep(1)
            
        elif (algo == 'best' or not model) and best_model:
            print(f"Using BEST Model to predict {file.filename}...")
            processed_img = preprocess_image(image)
            prediction = best_model.predict(processed_img)
            pred_idx = np.argmax(prediction[0])
            confidence = float(np.max(prediction[0]) * 100)
            predicted_id = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else CLASS_NAMES[0]
            algorithm_used = 'Best Model'
            time.sleep(1)
            
        else:
            print(f"Using Simulation Mode to predict {file.filename}...")
            predicted_id, confidence = simulated_classify(image)
            algorithm_used = 'Simulation (Fallback)'
            time.sleep(1.5)
            
        # MongoDB Integration
        if HAS_DB:
            pred_data = {
                "image_name": file.filename,
                "predicted_disease": predicted_id,
                "confidence": round(confidence, 2),
                "top_3_predictions": [
                    {"class": predicted_id, "confidence": round(confidence, 2)}
                ],
                "risk_level": "High" if "healthy" not in predicted_id.lower() else "Low",
                "weather_data": {
                    "location": "Lahore, PK",
                    "temperature": 34,
                    "humidity": 72,
                    "condition": "Humid"
                },
                "treatment_suggestions": [
                    "Follow standard treatment plan" if "healthy" not in predicted_id.lower() else "No treatment needed"
                ],
                "used_model": algorithm_used,
                "timestamp": "Auto Generated"
            }
            insert_prediction(pred_data)

        return jsonify({
            'disease_id': predicted_id,
            'confidence': round(confidence, 2),
            'algorithm': algorithm_used,
            'status': 'success'
        })
        
    except Exception as e:
        print("Error during prediction:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/model-comparison', methods=['GET'])
def model_comparison():
    try:
        with open('models/model_metrics.json', 'r') as f:
            metrics = json.load(f)
        
        # Find best model
        best_model = None
        best_acc = 0
        for m, data in metrics.items():
            if data['accuracy'] > best_acc:
                best_acc = data['accuracy']
                best_model = m
                
        return jsonify({
            'models': metrics,
            'best_model': best_model
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['GET'])
def history():
    if not HAS_DB: return jsonify([])
    return jsonify(get_all_predictions())

@app.route('/delete-history/<id>', methods=['DELETE'])
def delete_history_item(id):
    if not HAS_DB: return jsonify({'success': False})
    success = delete_prediction(id)
    return jsonify({'success': success})

@app.route('/clear-history', methods=['DELETE'])
def clear_history():
    if not HAS_DB: return jsonify({'success': False})
    success = clear_all_history()
    return jsonify({'success': success})

@app.route('/generate-report', methods=['GET'])
def generate_report():
    if not HAS_DB: return jsonify({'error': 'No DB'})
    try:
        pdf_path = generate_pdf_report()
        return send_file(pdf_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def home():
    status = "REAL MODEL LOADED" if model else "SIMULATION MODE"
    return f"FasalAI Backend is Running ({status})"

if __name__ == '__main__':
    print("Starting FasalAI Flask Server on http://localhost:5000...")
    app.run(debug=True, port=5000)
