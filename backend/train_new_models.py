import os
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import ResNet50, EfficientNetB0
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout, BatchNormalization
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

DATASET_PATH = r"C:\Users\noorf\Desktop\PlantVillage"
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

def load_data():
    datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest',
        validation_split=0.2
    )

    train_gen = datagen.flow_from_directory(
        DATASET_PATH,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training'
    )

    val_gen = datagen.flow_from_directory(
        DATASET_PATH,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation'
    )
    
    return train_gen, val_gen

def build_resnet50(num_classes):
    base_model = ResNet50(weights='imagenet', include_top=False, input_shape=(224,224,3))
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.4)(x)
    x = Dense(256, activation='relu')(x)
    x = Dropout(0.3)(x)
    predictions = Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    
    # Fine-tune last 30 layers
    for layer in base_model.layers[:-30]:
        layer.trainable = False
        
    model.compile(optimizer=Adam(learning_rate=0.001), loss='categorical_crossentropy', metrics=['accuracy'])
    return model

def build_efficientnetb0(num_classes):
    base_model = EfficientNetB0(weights='imagenet', include_top=False, input_shape=(224,224,3))
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.4)(x)
    x = Dense(256, activation='relu')(x)
    x = Dropout(0.3)(x)
    predictions = Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    
    # Fine-tune last 20 layers
    for layer in base_model.layers[:-20]:
        layer.trainable = False
        
    model.compile(optimizer=Adam(learning_rate=0.001), loss='categorical_crossentropy', metrics=['accuracy'])
    return model

def train_and_evaluate():
    print("Loading data...")
    train_gen, val_gen = load_data()
    num_classes = train_gen.num_classes
    
    callbacks_resnet = [
        EarlyStopping(patience=5, restore_best_weights=True),
        ReduceLROnPlateau(factor=0.3, patience=3),
        ModelCheckpoint(os.path.join(MODELS_DIR, 'resnet50_model.h5'), save_best_only=True)
    ]
    
    callbacks_effnet = [
        EarlyStopping(patience=5, restore_best_weights=True),
        ReduceLROnPlateau(factor=0.3, patience=3),
        ModelCheckpoint(os.path.join(MODELS_DIR, 'efficientnetb0_model.h5'), save_best_only=True)
    ]
    
    print("\n--- Training ResNet50 ---")
    resnet_model = build_resnet50(num_classes)
    resnet_model.fit(train_gen, validation_data=val_gen, epochs=15, callbacks=callbacks_resnet)
    
    print("\n--- Training EfficientNetB0 ---")
    effnet_model = build_efficientnetb0(num_classes)
    effnet_model.fit(train_gen, validation_data=val_gen, epochs=15, callbacks=callbacks_effnet)

if __name__ == "__main__":
    train_and_evaluate()
