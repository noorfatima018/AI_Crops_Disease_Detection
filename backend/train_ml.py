import os
import cv2
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score

# Configuration
DATASET_PATH = r"C:\Users\noorf\Desktop\PlantVillage"
IMG_SIZE = (64, 64)  # Small size for classical ML

print(f"Loading images from: {DATASET_PATH}")
X = []
y = []

# Map dataset folder names to frontend IDs
CLASS_MAP = {
    "Pepper__bell___Bacterial_spot": "bacterial_spot",
    "Pepper__bell___healthy": "healthy"
}
classes = list(CLASS_MAP.values())

# Check if dataset exists
if not os.path.exists(DATASET_PATH):
    print(f"Error: Dataset not found at {DATASET_PATH}")
    exit()

# Load dataset
class_idx = 0
for folder_name in os.listdir(DATASET_PATH):
    folder_path = os.path.join(DATASET_PATH, folder_name)
    if os.path.isdir(folder_path):
        # Determine the mapped class ID
        mapped_class_id = CLASS_MAP.get(folder_name, folder_name)
        if mapped_class_id not in classes:
            classes.append(mapped_class_id)
            
        current_idx = classes.index(mapped_class_id)
        print(f"Loading folder: {folder_name} -> mapped to: {mapped_class_id} (Label: {current_idx})")
        
        count = 0
        for img_name in os.listdir(folder_path):
            img_path = os.path.join(folder_path, img_name)
            try:
                # Read image, resize, and convert to RGB
                img = cv2.imread(img_path)
                if img is None: continue
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                img = cv2.resize(img, IMG_SIZE)
                
                # Flatten the image into a 1D array
                X.append(img.flatten())
                y.append(current_idx)
                
                count += 1
                # To save time, limit to 600 images per class
                if count >= 600: break
            except Exception as e:
                pass

# Convert to numpy arrays
X = np.array(X)
y = np.array(y)

# Normalize pixel values (0 to 1)
X = X / 255.0

print(f"Total images loaded: {len(X)}")
print(f"Features per image: {X.shape[1]}")
print(f"Classes found: {classes}")

if len(X) == 0:
    print("No images were loaded. Check your dataset path.")
    exit()

# Split the dataset
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("\n--- Training SVM ---")
svm_model = SVC(kernel='linear', probability=True, random_state=42)
svm_model.fit(X_train, y_train)
svm_preds = svm_model.predict(X_test)
svm_acc = accuracy_score(y_test, svm_preds)
print(f"SVM Accuracy: {svm_acc * 100:.2f}%")

print("\n--- Training KNN ---")
knn_model = KNeighborsClassifier(n_neighbors=5)
knn_model.fit(X_train, y_train)
knn_preds = knn_model.predict(X_test)
knn_acc = accuracy_score(y_test, knn_preds)
print(f"KNN Accuracy: {knn_acc * 100:.2f}%")

# Save the models and classes
print("\nSaving models...")
joblib.dump(svm_model, 'svm_model.pkl')
joblib.dump(knn_model, 'knn_model.pkl')
joblib.dump(classes, 'ml_classes.pkl')

print("Done! Models saved as 'svm_model.pkl' and 'knn_model.pkl'.")
