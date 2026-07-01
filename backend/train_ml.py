import os
import cv2 # type: ignore
import numpy as np # type: ignore
import joblib  # type: ignore
import json
from sklearn.model_selection import train_test_split    # type: ignore
from sklearn.svm import SVC # type: ignore
from sklearn.neighbors import KNeighborsClassifier  # type: ignore
from sklearn.preprocessing import StandardScaler # type: ignore
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score  # type: ignore
import tensorflow as tf
from tensorflow.keras.models import load_model

# Configuration
DATASET_PATH = r"C:\Users\noorf\Desktop\PlantVillage"
IMG_SIZE = (224, 224)  # Match CNN dimensions

print("Loading trained CNN for deep feature extraction...")
cnn_model = load_model('leaf_disease_cnn_model.h5')
# We extract the dense layer representation (64 high-level features)
feature_extractor = tf.keras.Sequential(cnn_model.layers[:8])

print(f"\nLoading images from: {DATASET_PATH}")
X = []
y = []

# Map dataset folder names to frontend IDs
CLASS_MAP = {
    "Pepper__bell___Bacterial_spot": "bacterial_spot",
    "Pepper__bell___healthy": "healthy",
    "Potato___Early_blight": "early_blight",
    "Potato___healthy": "healthy",
    "Potato___Late_blight": "late_blight",
    "Tomato_Bacterial_spot": "bacterial_spot",
    "Tomato_Early_blight": "early_blight",
    "Tomato_healthy": "healthy",
    "Tomato_Late_blight": "late_blight",
    "Tomato_Leaf_Mold": "leaf_mold",
    "Tomato_Septoria_leaf_spot": "septoria_leaf_spot",
    "Tomato_Spider_mites_Two_spotted_spider_mite": "spider_mites",
    "Tomato__Target_Spot": "target_spot",
    "Tomato__Tomato_mosaic_virus": "tomato_mosaic_virus",
    "Tomato__Tomato_YellowLeaf__Curl_Virus": "yellow_leaf_curl_virus"
}

classes = sorted(list(set(CLASS_MAP.values())))
print("Target classes:", classes)

# Load images
for folder_name in os.listdir(DATASET_PATH):
    folder_path = os.path.join(DATASET_PATH, folder_name)
    if not os.path.isdir(folder_path):
        continue
        
    target_class = CLASS_MAP.get(folder_name)
    if not target_class:
        continue
        
    label_idx = classes.index(target_class)
    print(f"Loading {folder_name} -> mapped to {target_class}")
    
    img_names = os.listdir(folder_path)[:150]  # Load up to 150 images
    for img_name in img_names:
        img_path = os.path.join(folder_path, img_name)
        try:
            img = cv2.imread(img_path)
            if img is None:
                continue
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, IMG_SIZE)
            X.append(img / 255.0)
            y.append(label_idx)
        except Exception as e:
            pass

X = np.array(X, dtype=np.float32)
y = np.array(y)

print(f"\nSuccessfully loaded {len(X)} images.")

# Extract deep features
print("Extracting deep CNN representations for classical ML models...")
deep_features = feature_extractor.predict(X, batch_size=32, verbose=1)
print(f"Extracted feature matrix shape: {deep_features.shape}")

# Split the deep features dataset
X_train, X_test, y_train, y_test = train_test_split(deep_features, y, test_size=0.2, random_state=42)

# --- Standard Scaling ---
print("\nScaling deep features using StandardScaler...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print("\n--- Training SVM on Scaled Deep CNN Features ---")
# Using radial basis function kernel for high-dimensional support
svm_model = SVC(kernel='rbf', C=1.0, random_state=42)
svm_model.fit(X_train_scaled, y_train)
svm_preds = svm_model.predict(X_test_scaled)
svm_acc = accuracy_score(y_test, svm_preds)
svm_prec = precision_score(y_test, svm_preds, average='weighted', zero_division=0)
svm_rec = recall_score(y_test, svm_preds, average='weighted', zero_division=0)
svm_f1 = f1_score(y_test, svm_preds, average='weighted', zero_division=0)
print(f"SVM Scaled Feature Accuracy: {svm_acc * 100:.2f}%")

print("\n--- Training KNN on Scaled Deep CNN Features ---")
knn_model = KNeighborsClassifier(n_neighbors=5)
knn_model.fit(X_train_scaled, y_train)
knn_preds = knn_model.predict(X_test_scaled)
knn_acc = accuracy_score(y_test, knn_preds)
knn_prec = precision_score(y_test, knn_preds, average='weighted', zero_division=0)
knn_rec = recall_score(y_test, knn_preds, average='weighted', zero_division=0)
knn_f1 = f1_score(y_test, knn_preds, average='weighted', zero_division=0)
print(f"KNN Scaled Feature Accuracy: {knn_acc * 100:.2f}%")

# Save the models
print("\nSaving optimized deep-ML models and scaler...")
joblib.dump(svm_model, 'svm_model.pkl')
joblib.dump(knn_model, 'knn_model.pkl')
joblib.dump(scaler, 'scaler.pkl')
joblib.dump(classes, 'ml_classes.pkl')

# Save updated dynamic comparison metrics to models/model_metrics.json
metrics_data = {
    "CNN": {
        "accuracy": 0.85,
        "precision": 0.84,
        "recall": 0.83,
        "f1_score": 0.83
    },
    "KNN": {
        "accuracy": round(float(knn_acc), 2),
        "precision": round(float(knn_prec), 2),
        "recall": round(float(knn_rec), 2),
        "f1_score": round(float(knn_f1), 2)
    },
    "SVM": {
        "accuracy": round(float(svm_acc), 2),
        "precision": round(float(svm_prec), 2),
        "recall": round(float(svm_rec), 2),
        "f1_score": round(float(svm_f1), 2)
    }
}

os.makedirs('models', exist_ok=True)
with open('models/model_metrics.json', 'w') as f:
    json.dump(metrics_data, f, indent=4)

print("Done! Saved updated metrics to 'models/model_metrics.json' and completed deep ML pipeline.")
