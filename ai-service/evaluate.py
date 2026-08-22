import os
import urllib.request
import uuid
import json

# Map folder names to expected classification labels returned by FastAPI
FOLDER_TO_LABEL = {
    "healthy": "Daun Sehat",
    "leaf spot": "Bercak Daun (Leaf Spot)",
    "yellowish": "Daun Menguning (Yellowish)"
}

def predict_image(image_path):
    url = "http://127.0.0.1:8000/predict"
    boundary = uuid.uuid4().hex
    
    with open(image_path, "rb") as f:
        image_content = f.read()
        
    filename = os.path.basename(image_path)
    
    # Construct multipart request payload
    payload = []
    payload.append(f"--{boundary}".encode('utf-8'))
    payload.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode('utf-8'))
    payload.append(b'Content-Type: image/jpeg')
    payload.append(b'')
    payload.append(image_content)
    payload.append(f"--{boundary}--".encode('utf-8'))
    payload.append(b'')
    
    body = b'\r\n'.join(payload)
    
    req = urllib.request.Request(url, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    try:
        with urllib.request.urlopen(req) as res:
            response_data = json.loads(res.read().decode('utf-8'))
            return response_data.get("hasil_klasifikasi"), response_data.get("confidence")
    except Exception as e:
        print(f"[ERROR] Failed to predict {filename}: {e}")
        return None, None

def run_evaluation():
    test_dir = "dataset/test"
    if not os.path.exists(test_dir):
        print(f"Test directory not found: {test_dir}")
        return
        
    total_images = 0
    correct_predictions = 0
    
    print("=== STARTING MODEL EVALUATION ON TEST DATASET ===")
    
    # Iterate through all class directories in test dataset
    for class_folder in sorted(os.listdir(test_dir)):
        class_path = os.path.join(test_dir, class_folder)
        if not os.path.isdir(class_path):
            continue
            
        expected_label = FOLDER_TO_LABEL.get(class_folder)
        if not expected_label:
            print(f"[WARN] Unknown test folder: {class_folder}, skipping...")
            continue
            
        print(f"\nEvaluating class: '{class_folder}' (Expected Label: '{expected_label}')")
        
        class_total = 0
        class_correct = 0
        
        for filename in sorted(os.listdir(class_path)):
            if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue
                
            image_path = os.path.join(class_path, filename)
            prediction, confidence = predict_image(image_path)
            
            if prediction:
                is_correct = (prediction == expected_label)
                if is_correct:
                    class_correct += 1
                    correct_predictions += 1
                class_total += 1
                total_images += 1
                
                status_str = "CORRECT" if is_correct else f"WRONG (Got '{prediction}')"
                print(f"  - {filename}: {status_str} [Conf: {confidence}]")
                
        if class_total > 0:
            class_acc = (class_correct / class_total) * 100
            print(f"Class '{class_folder}' Accuracy: {class_acc:.2f}% ({class_correct}/{class_total})")
            
    if total_images > 0:
        overall_acc = (correct_predictions / total_images) * 100
        print("\n==================================================")
        print(f"EVALUATION COMPLETE!")
        print(f"Total Images Evaluated: {total_images}")
        print(f"Correct Predictions   : {correct_predictions}")
        print(f"Overall Accuracy      : {overall_acc:.2f}%")
        print("==================================================")
    else:
        print("No test images evaluated.")

if __name__ == "__main__":
    run_evaluation()
