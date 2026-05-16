from pymongo import MongoClient
from datetime import datetime
import json
from bson.objectid import ObjectId

# MongoDB configuration
MONGO_URI = "mongodb+srv://Noor_Fatima_018:xk6ZBvopwTrfSA2A@cluster0.ejixx0v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "fasalai"
COLLECTION_NAME = "predictions"

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    client.server_info() # Trigger exception if cannot connect
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    db_connected = True
except Exception as e:
    print(f"MongoDB connection failed: {e}")
    db_connected = False

def insert_prediction(data):
    """
    Store EVERY prediction automatically with the specified structure.
    """
    if not db_connected:
        return None
        
    try:
        # Ensure timestamp is set
        if "timestamp" not in data or data["timestamp"] == "Auto Generated":
            data["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
        result = collection.insert_one(data)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Error inserting prediction: {e}")
        return None

def get_all_predictions():
    if not db_connected:
        return []
    
    try:
        predictions = list(collection.find().sort("_id", -1))
        # Convert ObjectId to string for JSON serialization
        for p in predictions:
            p["_id"] = str(p["_id"])
        return predictions
    except Exception as e:
        print(f"Error fetching predictions: {e}")
        return []

def delete_prediction(pred_id):
    if not db_connected:
        return False
        
    try:
        result = collection.delete_one({"_id": ObjectId(pred_id)})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting prediction: {e}")
        return False

def clear_all_history():
    if not db_connected:
        return False
        
    try:
        result = collection.delete_many({})
        return result.deleted_count >= 0
    except Exception as e:
        print(f"Error clearing history: {e}")
        return False
