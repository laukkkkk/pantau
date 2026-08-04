import urllib.request
import uuid
import json
import os

def test_real_image():
    url = "http://127.0.0.1:8000/predict"
    boundary = uuid.uuid4().hex
    
    # Read real image from mobile/assets/favicon.png
    image_path = "../mobile/assets/favicon.png"
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        return
        
    with open(image_path, "rb") as f:
        image_content = f.read()
        
    # Construct multipart request payload
    payload = []
    payload.append(f"--{boundary}".encode('utf-8'))
    payload.append(f'Content-Disposition: form-data; name="file"; filename="favicon.png"'.encode('utf-8'))
    payload.append(b'Content-Type: image/png')
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
            print("[SUCCESS] Real image prediction response:")
            print(json.dumps(response_data, indent=2))
            assert "hasil_klasifikasi" in response_data
            assert "confidence" in response_data
            assert "rekomendasi" in response_data
    except Exception as e:
        print(f"[FAIL] Real image prediction failed: {e}")
        raise e

if __name__ == "__main__":
    test_real_image()
