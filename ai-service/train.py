import os
import sys
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import numpy as np

# Define classes
CLASSES = ["healthy", "leaf curl", "leaf spot", "whitefly", "yellowish"]

class SyntheticPestDataset(Dataset):
    def __init__(self, num_samples_per_class=50, transform=None):
        self.num_samples_per_class = num_samples_per_class
        self.transform = transform
        self.data = []
        self.labels = []
        
        # Color signatures for our synthetic classes:
        # Class 0: healthy (Bright Green)
        # Class 1: leaf curl (Wilted Dark Olive/Grayish Green)
        # Class 2: leaf spot (Brownish/Green spots)
        # Class 3: whitefly (Yellowish/Greenish dots)
        # Class 4: yellowish (Pale Yellowish Green)
        for class_idx in range(5):
            for _ in range(num_samples_per_class):
                # Create a 224x224 RGB image
                img_data = np.zeros((224, 224, 3), dtype=np.uint8)
                
                # Base background color
                if class_idx == 0:
                    # Bright Green: R=34, G=139, B=34
                    img_data[:, :, 0] = 34
                    img_data[:, :, 1] = 139
                    img_data[:, :, 2] = 34
                elif class_idx == 1:
                    # Dark Olive/Grayish Green: R=85, G=107, B=47
                    img_data[:, :, 0] = 85
                    img_data[:, :, 1] = 107
                    img_data[:, :, 2] = 47
                elif class_idx == 2:
                    # Brown: R=139, G=69, B=19
                    img_data[:, :, 0] = 139
                    img_data[:, :, 1] = 69
                    img_data[:, :, 2] = 19
                elif class_idx == 3:
                    # Yellow/Green: R=218, G=165, B=32
                    img_data[:, :, 0] = 218
                    img_data[:, :, 1] = 165
                    img_data[:, :, 2] = 32
                elif class_idx == 4:
                    # Pale Yellow: R=200, G=200, B=50
                    img_data[:, :, 0] = 200
                    img_data[:, :, 1] = 200
                    img_data[:, :, 2] = 50
                    
                # Add some random noise & patterns
                noise = np.random.randint(-15, 15, (224, 224, 3))
                img_data = np.clip(img_data.astype(np.int16) + noise, 0, 255).astype(np.uint8)
                
                img = Image.fromarray(img_data)
                self.data.append(img)
                self.labels.append(class_idx)
                
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        img = self.data[idx]
        label = self.labels[idx]
        if self.transform:
            img = self.transform(img)
        return img, label

def train_model():
    print("=== STARTING MODEL TRAINING PIPELINE ===")
    
    # Device configuration
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Transforms
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    # Check if a custom dataset directory exists
    dataset_dir = "dataset"
    if os.path.exists(dataset_dir) and len(os.listdir(dataset_dir)) > 0:
        print(f"[SUCCESS] Real dataset found at '{dataset_dir}'. Loading using ImageFolder...")
        # Assume dataset contains 'train' and 'val' subdirectories
        train_path = os.path.join(dataset_dir, "train")
        val_path = os.path.join(dataset_dir, "val")
        if os.path.exists(train_path) and os.path.exists(val_path):
            from torchvision.datasets import ImageFolder
            train_dataset = ImageFolder(train_path, transform=train_transform)
            val_dataset = ImageFolder(val_path, transform=val_transform)
        else:
            print("[WARN] Dataset directory exists but doesn't have 'train'/'val' split. Using synthetic fallback...")
            train_dataset = SyntheticPestDataset(num_samples_per_class=100, transform=train_transform)
            val_dataset = SyntheticPestDataset(num_samples_per_class=30, transform=val_transform)
    else:
        print("[INFO] No real dataset directory found. Generating synthetic dataset in-memory...")
        train_dataset = SyntheticPestDataset(num_samples_per_class=100, transform=train_transform)
        val_dataset = SyntheticPestDataset(num_samples_per_class=30, transform=val_transform)
        
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False)
    
    print(f"Dataset Size - Train: {len(train_dataset)}, Validation: {len(val_dataset)}")
    
    # Initialize MobileNetV3 Small (Transfer Learning)
    print("Loading pretrained MobileNetV3-Small architecture...")
    try:
        # Modern PyTorch API
        from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
        model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
    except Exception:
        # Legacy PyTorch API fallback
        model = models.mobilenet_v3_small(pretrained=True)
        
    # Freeze all model parameters to preserve pre-trained feature extractor
    for param in model.parameters():
        param.requires_grad = False
        
    # Replace classifier head for 5 classes
    num_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(num_features, 5)
    
    # Ensure classifier parameters are trainable
    for param in model.classifier.parameters():
        param.requires_grad = True
        
    model = model.to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=0.001)
    
    # Training Loop
    epochs = 8
    best_acc = 0.0
    
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        correct_train = 0
        total_train = 0
        
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs.data, 1)
            total_train += labels.size(0)
            correct_train += (predicted == labels).sum().item()
            
        epoch_loss = running_loss / len(train_loader.dataset)
        train_acc = correct_train / total_train
        
        # Validation
        model.eval()
        correct_val = 0
        total_val = 0
        val_loss = 0.0
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                _, predicted = torch.max(outputs.data, 1)
                total_val += labels.size(0)
                correct_val += (predicted == labels).sum().item()
                
        epoch_val_loss = val_loss / len(val_loader.dataset)
        val_acc = correct_val / total_val
        
        print(f"Epoch {epoch+1}/{epochs} | "
              f"Train Loss: {epoch_loss:.4f} Acc: {train_acc*100:.2f}% | "
              f"Val Loss: {epoch_val_loss:.4f} Acc: {val_acc*100:.2f}%")
              
        # Save best model
        if val_acc > best_acc:
            best_acc = val_acc
            # Ensure models directory exists
            os.makedirs("models", exist_ok=True)
            torch.save(model.state_dict(), "models/pest_classifier.pth")
            print(f"  [SUCCESS] Best model saved to 'models/pest_classifier.pth' with accuracy {val_acc*100:.2f}%")
            
    print(f"\n[SUCCESS] Training complete! Best validation accuracy: {best_acc*100:.2f}%")
    
if __name__ == "__main__":
    train_model()
