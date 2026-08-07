import os
import io
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env.local"))

app = FastAPI(title="Nulltrace Sentinel — Python AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Network Scanner (no ML deps needed, always available) ─────────────────────
from network_scanner import router as network_scanner_router
from subdomain_discovery import router as subdomain_discovery_router
app.include_router(network_scanner_router)
app.include_router(subdomain_discovery_router)
print("[Nulltrace] OK Network scanner and Subdomain discovery routers loaded.")

# ── Image Deepfake Detector (requires transformers + pillow) ──────────────────
detector = None
try:
    from PIL import Image
    from transformers import pipeline
    print("[Nulltrace] Loading image deepfake model (Ateeqq/ai-vs-human-image-detector)...")
    detector = pipeline("image-classification", model="Ateeqq/ai-vs-human-image-detector")
    print("[Nulltrace] OK Image deepfake model loaded.")
except Exception as e:
    print(f"[Nulltrace] WARN Image deepfake model NOT loaded (transformers/pillow missing): {e}")
    print("[Nulltrace]     Install with: pip install transformers torch pillow")

@app.post("/detect-image")
async def detect_image(image: UploadFile = File(...)):
    if not image:
        raise HTTPException(status_code=400, detail="Image file is required")
    if detector is None:
        raise HTTPException(
            status_code=503,
            detail="Image deepfake model not loaded. Install: pip install transformers torch pillow"
        )
    try:
        from PIL import Image as PILImage
        image_bytes = await image.read()
        pil_image = PILImage.open(io.BytesIO(image_bytes))
        results = detector(pil_image)
        best = max(results, key=lambda x: x["score"])
        label = best["label"].lower()
        score = best["score"] * 100
        is_ai = (label == "ai")
        return {
            "type": "AI_GENERATED" if is_ai else "REAL",
            "confidence": round(score, 2),
            "reason": f"Local model (Ateeqq/ai-vs-human-image-detector) classified this as {'AI-generated' if is_ai else 'human-created (real)'}.",
            "provider": "Hugging Face Local"
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(err)}")

# ── Voice Detector (requires transformers + librosa) ──────────────────────────
try:
    from voice_detector import router as voice_detector_router
    app.include_router(voice_detector_router)
    print("[Nulltrace] OK Voice detector router loaded.")
except Exception as e:
    print(f"[Nulltrace] WARN Voice detector NOT loaded: {e}")

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "imageModel": detector is not None,
        "networkScanner": True,
    }

@app.get("/")
def home():
    return {
        "status": "online",
        "project": "Nulltrace API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
