import random
import os
import io
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, File, UploadFile, Header, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import torch.nn as nn
# pyrefly: ignore [missing-import]
from torchvision import transforms
# pyrefly: ignore [missing-import]
import torchvision.models as models
# pyrefly: ignore [missing-import]
from PIL import Image

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")
env = os.getenv("ENV") or os.getenv("NODE_ENV") or "development"
docs_url = None if env == "production" else "/docs"
redoc_url = None if env == "production" else "/redoc"

app = FastAPI(
    title="Pantau AI Service",
    description="Microservice untuk deteksi hama dan penyakit tanaman menggunakan model deep learning.",
    version="1.0.0",
    docs_url=docs_url,
    redoc_url=redoc_url
)

# Konfigurasi CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.60"))

# Model Response format yang disetujui
class PredictionResponse(BaseModel):
    hasil_klasifikasi: str
    confidence: float
    rekomendasi: str
    is_confident: bool = True
    is_fallback: bool = False

# Daftar diagnosis
DIAGNOSES = [
    {
        "hasil_klasifikasi": "Daun Sehat",
        "rekomendasi": "Tanaman cabai jawa dalam kondisi sehat dan prima. Lakukan pemeliharaan rutin, penyiraman yang stabil, serta pemupukan berimbang secara berkala."
    },
    {
        "hasil_klasifikasi": "Bercak Daun (Leaf Spot)",
        "rekomendasi": "Semprot dengan fungisida berbahan aktif tembaga hidroksida atau mankozeb. Kurangi kelembaban dengan memperbaiki sirkulasi udara dan pangkas daun yang terinfeksi."
    },
    {
        "hasil_klasifikasi": "Daun Menguning (Yellowish)",
        "rekomendasi": "Beri pupuk dengan kandungan Nitrogen (N) dan unsur mikro besi (Fe) yang cukup. Periksa drainase tanah untuk menghindari pembusukan akar akibat penyiraman berlebih."
    }
]

# Global variables for model
model = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model_path = "models/pest_classifier.pth"

# Transform pipeline for input images
prediction_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

@app.on_event("startup")
def load_model():
    global model
    print(f"[INFO] Checking for model at {model_path}...")
    if os.path.exists(model_path):
        try:
            print("[INFO] Loading MobileNetV3 model structure...")
            try:
                # pyrefly: ignore [missing-import]
                from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
                model = mobilenet_v3_small(weights=None)
            except Exception:
                model = models.mobilenet_v3_small(pretrained=False)
                
            # Replace final classifier layer
            num_features = model.classifier[3].in_features
            model.classifier[3] = nn.Linear(num_features, 3)
            
            # Load state dict
            model.load_state_dict(torch.load(model_path, map_location=device))
            model.to(device)
            model.eval()
            print("[SUCCESS] PyTorch model loaded successfully and set to eval mode.")
        except Exception as e:
            print(f"[WARN] Error loading PyTorch model weights: {e}")
            model = None
    else:
        print("[WARN] Model file not found. Falling back to filename-based dummy prediction.")

@app.get("/")
def read_root():
    model_loaded = model is not None
    return {
        "status": "online",
        "service": "pantau-ai-service",
        "model_loaded": model_loaded,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "info": "Gunakan endpoint POST /predict dengan mengunggah gambar tanaman untuk klasifikasi."
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_pest(
    file: UploadFile = File(...),
    x_api_key: str = Header(None)
):
    global model
    
    # Verify API key if configured
    if INTERNAL_API_KEY and x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    filename = file.filename.lower()
    
    # 1. Try PyTorch inference if model is loaded
    if model is not None:
        try:
            # Read image data
            image_data = await file.read()
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            
            # Process image
            input_tensor = prediction_transforms(image).unsqueeze(0).to(device)
            
            # Inference
            with torch.no_grad():
                outputs = model(input_tensor)
                probabilities = torch.softmax(outputs, dim=1)[0]
                confidence, predicted_idx = torch.max(probabilities, dim=0)
                
            class_idx = predicted_idx.item()
            conf_val = round(confidence.item(), 2)
            
            # Check confidence threshold
            if conf_val < CONFIDENCE_THRESHOLD:
                print(f"[WARN] PyTorch Inference: Confidence {conf_val} below threshold {CONFIDENCE_THRESHOLD}. Returning low confidence response.")
                return {
                    "hasil_klasifikasi": "Foto Kurang Jelas / Tidak Yakin",
                    "confidence": conf_val,
                    "rekomendasi": "Foto kurang jelas atau sudut pengambilan foto kurang dekat ke daun. Silakan foto ulang dengan pencahayaan lebih terang dan posisi lebih dekat ke permukaan daun cabai jawa.",
                    "is_confident": False,
                    "is_fallback": False
                }
            
            selected_diagnosis = DIAGNOSES[class_idx]
            print(f"[SUCCESS] PyTorch Inference: Class {class_idx} ({selected_diagnosis['hasil_klasifikasi']}) with confidence {conf_val}")
            
            return {
                "hasil_klasifikasi": selected_diagnosis["hasil_klasifikasi"],
                "confidence": conf_val,
                "rekomendasi": selected_diagnosis["rekomendasi"],
                "is_confident": True,
                "is_fallback": False
            }
        except Exception as e:
            print(f"[WARN] PyTorch Inference failed, falling back to dummy logic: {e}")
            
    # 2. Fallback to keyword/dummy logic if model is not loaded or inference failed
    selected_diagnosis = None
    if "healthy" in filename or "sehat" in filename:
        selected_diagnosis = DIAGNOSES[0] # Daun Sehat
    elif "spot" in filename or "bercak" in filename:
        selected_diagnosis = DIAGNOSES[1] # Bercak Daun (Leaf Spot)
    elif "yellow" in filename or "kuning" in filename:
        selected_diagnosis = DIAGNOSES[2] # Daun Menguning (Yellowish)
    else:
        selected_diagnosis = random.choice(DIAGNOSES)

    confidence = round(random.uniform(0.70, 0.85), 2)

    print(f"[SUCCESS] Fallback Dummy: {selected_diagnosis['hasil_klasifikasi']} with confidence {confidence} (is_fallback=True)")
    return {
        "hasil_klasifikasi": selected_diagnosis["hasil_klasifikasi"],
        "confidence": confidence,
        "rekomendasi": selected_diagnosis["rekomendasi"],
        "is_confident": True,
        "is_fallback": True
    }
