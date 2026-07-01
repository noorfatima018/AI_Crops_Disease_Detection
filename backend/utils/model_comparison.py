import json
import os
import shutil

METRICS_FILE = "models/model_metrics.json"

def compare_and_save_metrics():
    """
    Simulates fetching and saving metrics for the 3 models (CNN, KNN, SVM).
    """
    os.makedirs("models", exist_ok=True)
    
    metrics = {
        "CNN": {
            "accuracy": 0.85,
            "precision": 0.84,
            "recall": 0.83,
            "f1_score": 0.83
        },
        "KNN": {
            "accuracy": 0.78,
            "precision": 0.77,
            "recall": 0.76,
            "f1_score": 0.76
        },
        "SVM": {
            "accuracy": 0.82,
            "precision": 0.81,
            "recall": 0.80,
            "f1_score": 0.80
        }
    }
    
    with open(METRICS_FILE, "w") as f:
        json.dump(metrics, f, indent=4)
        
    print("\n==================================")
    print("MODEL COMPARISON RESULTS")
    print("==================================\n")
    
    best_model = None
    best_acc = 0
    
    for model_name, data in metrics.items():
        print(model_name)
        print(f"Accuracy  : {int(data['accuracy']*100)}%")
        print(f"Precision : {int(data['precision']*100)}%")
        print(f"Recall    : {int(data['recall']*100)}%")
        print(f"F1 Score  : {int(data['f1_score']*100)}%\n")
        
        if data['accuracy'] > best_acc:
            best_acc = data['accuracy']
            best_model = model_name
            
    print("==================================")
    print(f"BEST MODEL: {best_model}")
    print(f"Accuracy: {int(best_acc*100)}%")
    print("==================================\n")
    
    return best_model

if __name__ == "__main__":
    compare_and_save_metrics()
