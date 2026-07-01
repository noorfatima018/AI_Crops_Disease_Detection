from pymongo import MongoClient # type: ignore
from datetime import datetime
import json
import sqlite3
import os
import uuid
from bson.objectid import ObjectId # type: ignore

# MongoDB configuration
MONGO_URI = "mongodb+srv://Noor_Fatima_018:xk6ZBvopwTrfSA2A@cluster0.ejixx0v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "fasalai"
COLLECTION_NAME = "predictions"

db_connected = False
collection = None

# SQLite Fallback Configuration
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "fasalai.db")

def init_sqlite():
    """
    Initialize local SQLite database to store predictions.
    """
    try:
        os.makedirs(os.path.dirname(SQLITE_DB_PATH), exist_ok=True)
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id TEXT PRIMARY KEY,
                predicted_disease TEXT,
                confidence REAL,
                timestamp TEXT,
                data TEXT
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error initializing local SQLite database: {e}")

def sync_local_to_atlas():
    """
    If MongoDB connects successfully, upload all local SQLite predictions to Atlas,
    then clear the local database so they are not duplicated.
    """
    global db_connected, collection
    if not db_connected or collection is None:
        return
        
    try:
        init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, data FROM predictions")
        rows = cursor.fetchall()
        
        if not rows:
            conn.close()
            return
            
        print(f"Found {len(rows)} unsynced local predictions. Syncing to MongoDB Atlas...")
        synced_count = 0
        
        for row in rows:
            pred_id, data_json = row
            try:
                data = json.loads(data_json)
                
                # Check if it already exists in Atlas to avoid duplicates
                # Use raw string _id check since SQLite IDs are string hex/UUIDs
                if not collection.find_one({"_id": data["_id"]}):
                    collection.insert_one(data)
                    synced_count += 1
            except Exception as e:
                print(f"Error syncing item {pred_id}: {e}")
                
        # Clear SQLite predictions since they are now synced
        cursor.execute("DELETE FROM predictions")
        conn.commit()
        conn.close()
        print(f"Successfully synced {synced_count} predictions to MongoDB Atlas!")
    except Exception as e:
        print(f"Error during SQLite to Atlas sync: {e}")

# Attempt to connect to MongoDB Atlas
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    client.server_info() # Trigger exception if cannot connect
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    db_connected = True
    print("Successfully connected to MongoDB Atlas!")
    # Trigger local-to-cloud synchronization
    sync_local_to_atlas()
except Exception as e:
    print(f"MongoDB connection failed: {e}")
    db_connected = False

if not db_connected:
    print(f"Using local SQLite fallback database at: {SQLITE_DB_PATH}")
    init_sqlite()

def insert_prediction(data):
    """
    Store EVERY prediction automatically with the specified structure.
    """
    global db_connected, collection
    
    # Ensure timestamp is set
    if "timestamp" not in data or data["timestamp"] == "Auto Generated":
        data["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
    # Generate unique ID upfront so it matches between SQLite and MongoDB
    pred_id = data.get("_id")
    if not pred_id:
        pred_id = uuid.uuid4().hex[:24]
        data["_id"] = pred_id
    else:
        data["_id"] = str(pred_id)

    # If MongoDB was not connected, let's try a quick reconnect to see if it is now available
    if not db_connected:
        try:
            print("Attempting to reconnect to MongoDB Atlas...")
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
            client.server_info()
            db = client[DB_NAME]
            collection = db[COLLECTION_NAME]
            db_connected = True
            print("Successfully reconnected to MongoDB Atlas!")
            # Trigger sync of past local predictions
            sync_local_to_atlas()
        except Exception:
            pass

    if db_connected:
        try:
            mongo_data = dict(data)
            collection.insert_one(mongo_data)
            print(f"Successfully saved prediction to MongoDB Atlas (ID: {pred_id})")
            return pred_id
        except Exception as e:
            print(f"Error inserting prediction to MongoDB: {e}")
            # Fall through to SQLite fallback if MongoDB fails mid-session
            
    # SQLite fallback
    try:
        init_sqlite()  # Ensure table exists
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        
        predicted_disease = data.get("predicted_disease", "Unknown")
        confidence = float(data.get("confidence", 0.0))
        timestamp = data.get("timestamp")
        
        # Serialize the full dict to JSON string for SQLite storage
        data_json = json.dumps(data)
        
        cursor.execute(
            "INSERT OR REPLACE INTO predictions (id, predicted_disease, confidence, timestamp, data) VALUES (?, ?, ?, ?, ?)",
            (pred_id, predicted_disease, confidence, timestamp, data_json)
        )
        conn.commit()
        conn.close()
        print(f"Successfully stored prediction locally in SQLite (ID: {pred_id})")
        return pred_id
    except Exception as e:
        print(f"Error inserting prediction to SQLite: {e}")
        return None

def get_all_predictions():
    global db_connected, collection
    
    # Try to reconnect if not connected
    if not db_connected:
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
            client.server_info()
            db = client[DB_NAME]
            collection = db[COLLECTION_NAME]
            db_connected = True
            print("Successfully reconnected to MongoDB Atlas!")
            sync_local_to_atlas()
        except Exception:
            pass

    if db_connected:
        try:
            predictions = list(collection.find().sort("_id", -1))
            # Convert ObjectId to string for JSON serialization
            for p in predictions:
                p["_id"] = str(p["_id"])
            return predictions
        except Exception as e:
            print(f"Error fetching predictions from MongoDB: {e}")
            # Fall through to SQLite fallback

    # SQLite fallback
    try:
        init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM predictions ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        conn.close()
        
        predictions = []
        for row in rows:
            try:
                p = json.loads(row[0])
                predictions.append(p)
            except Exception:
                pass
        return predictions
    except Exception as e:
        print(f"Error fetching predictions from SQLite: {e}")
        return []

def get_prediction_by_id(pred_id):
    """
    Retrieve a single prediction by its ID from MongoDB or local SQLite.
    """
    global db_connected, collection
    
    if db_connected:
        try:
            # First try as ObjectId
            try:
                p = collection.find_one({"_id": ObjectId(pred_id)})
            except Exception:
                p = None
            
            # If not found, try as raw string ID
            if not p:
                p = collection.find_one({"_id": str(pred_id)})
                
            if p:
                p["_id"] = str(p["_id"])
                return p
        except Exception as e:
            print(f"Error fetching prediction by ID from MongoDB: {e}")
            # Fall through to SQLite fallback

    # SQLite fallback
    try:
        init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM predictions WHERE id = ?", (str(pred_id),))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return json.loads(row[0])
    except Exception as e:
        print(f"Error fetching prediction by ID from SQLite: {e}")
    return None

def delete_prediction(pred_id):
    global db_connected, collection
    
    if db_connected:
        try:
            # Try to delete using ObjectId
            try:
                result = collection.delete_one({"_id": ObjectId(pred_id)})
                if result.deleted_count > 0:
                    return True
            except Exception:
                pass
                
            # Try to delete using string ID
            result = collection.delete_one({"_id": str(pred_id)})
            if result.deleted_count > 0:
                return True
        except Exception as e:
            print(f"Error deleting prediction from MongoDB: {e}")
            # Fall through to SQLite fallback
            
    # SQLite fallback
    try:
        init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM predictions WHERE id = ?", (str(pred_id),))
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        return deleted_count > 0
    except Exception as e:
        print(f"Error deleting prediction from SQLite: {e}")
        return False

def clear_all_history():
    global db_connected, collection
    
    if db_connected:
        try:
            result = collection.delete_many({})
            if result.deleted_count >= 0:
                return True
        except Exception as e:
            print(f"Error clearing history from MongoDB: {e}")
            # Fall through to SQLite fallback
            
    # SQLite fallback
    try:
        init_sqlite()
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM predictions")
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error clearing history from SQLite: {e}")
        return False
