import urllib.request
import uuid
import json

def test_prediction(filename, mock_content=b"dummy image data"):
    url = "http://127.0.0.1:8000/predict"
    boundary = uuid.uuid4().hex
    
    # Construct multipart request payload
    payload = []
    payload.append(f"--{boundary}".encode('utf-8'))
    payload.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode('utf-8'))
    payload.append(b'Content-Type: image/jpeg')
    payload.append(b'')
    payload.append(mock_content)
    payload.append(f"--{boundary}--".encode('utf-8'))
    payload.append(b'')
    
    body = b'\r\n'.join(payload)
    
    req = urllib.request.Request(url, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    try:
        with urllib.request.urlopen(req) as res:
            response_data = json.loads(res.read().decode('utf-8'))
            print(f"[SUCCESS] Test for file '{filename}':")
            print(f"  Classification : {response_data.get('hasil_klasifikasi')}")
            print(f"  Confidence     : {response_data.get('confidence')}")
            print(f"  Recommendation : {response_data.get('rekomendasi')}")
            
            # Assertion checks to verify model output scheme matches criteria
            assert "hasil_klasifikasi" in response_data
            assert "confidence" in response_data
            assert "rekomendasi" in response_data
    except Exception as e:
        print(f"[FAIL] Failed testing {filename}: {e}")
        raise e

if __name__ == "__main__":
    print("=== STARTING FASTAPI /PREDICT ENDPOINT TESTS ===")
    try:
        # Test specific pest keyword matching
        test_prediction("daun_sehat.jpeg")
        test_prediction("daun_keriting.jpg")
        test_prediction("daun_bercak.png")
        test_prediction("kutu_kebul.png")
        test_prediction("daun_kuning.jpeg")
        
        print("\n==========================================")
        print("ALL AI SERVICE ENDPOINT TESTS PASSED!")
        print("==========================================")
    except Exception:
        exit(1)
