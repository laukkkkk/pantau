import os
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import torch.nn as nn
# pyrefly: ignore [missing-import]
from torchvision import transforms, models
# pyrefly: ignore [missing-import]
from PIL import Image

CLASSES = ["healthy", "leaf spot", "yellowish"]
CLASS_LABELS = {
    "healthy": "Daun Sehat",
    "leaf spot": "Bercak Daun (Leaf Spot)",
    "yellowish": "Daun Menguning (Yellowish)"
}

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model_path = "models/pest_classifier.pth"

# Transforms
eval_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def evaluate():
    if not os.path.exists(model_path):
        print(f"[ERROR] Model file not found at {model_path}")
        return

    print("=== LOADING PYTORCH 3-CLASS MODEL FOR OFFLINE EVALUATION ===")
    try:
        from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
        model = mobilenet_v3_small(weights=None)
    except Exception:
        model = models.mobilenet_v3_small(pretrained=False)

    num_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(num_features, 3)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()

    test_dir = "dataset/test"
    if not os.path.exists(test_dir):
        print(f"[ERROR] Test directory not found: {test_dir}")
        return

    total_images = 0
    correct_predictions = 0

    for class_folder in sorted(os.listdir(test_dir)):
        class_path = os.path.join(test_dir, class_folder)
        if not os.path.isdir(class_path) or class_folder not in CLASSES:
            continue

        target_idx = CLASSES.index(class_folder)
        expected_label = CLASS_LABELS[class_folder]

        print(f"\nEvaluating class: '{class_folder}' ({expected_label})")
        class_total = 0
        class_correct = 0

        for filename in sorted(os.listdir(class_path)):
            if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue

            img_path = os.path.join(class_path, filename)
            try:
                img = Image.open(img_path).convert("RGB")
                tensor = eval_transforms(img).unsqueeze(0).to(device)

                with torch.no_grad():
                    outputs = model(tensor)
                    probs = torch.softmax(outputs, dim=1)[0]
                    conf, pred_idx = torch.max(probs, dim=0)

                pred_idx = pred_idx.item()
                conf_val = round(conf.item(), 4)
                is_correct = (pred_idx == target_idx)

                if is_correct:
                    class_correct += 1
                    correct_predictions += 1
                class_total += 1
                total_images += 1

                status_str = "CORRECT" if is_correct else f"WRONG (Got '{CLASSES[pred_idx]}')"
                print(f"  - {filename}: {status_str} [Conf: {conf_val:.2%}]")
            except Exception as e:
                print(f"  - {filename}: ERROR ({e})")

        if class_total > 0:
            print(f"Class '{class_folder}' Accuracy: {(class_correct/class_total)*100:.2f}% ({class_correct}/{class_total})")

    if total_images > 0:
        overall_acc = (correct_predictions / total_images) * 100
        print("\n==================================================")
        print("EVALUATION COMPLETE!")
        print(f"Total Images Evaluated: {total_images}")
        print(f"Correct Predictions   : {correct_predictions}")
        print(f"Overall Test Accuracy : {overall_acc:.2f}%")
        print("==================================================")

if __name__ == "__main__":
    evaluate()
