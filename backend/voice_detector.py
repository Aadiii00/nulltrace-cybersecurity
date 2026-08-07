import os
import sys
import torch
import torch.nn.functional as F
import numpy as np
import librosa
import tempfile
from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter(prefix="/api")

# Global variables for model and device
model = None
device = None

def load_model_and_env():
    global model, device
    
    # Locate and load env variables from .env.local for HF_TOKEN
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env_paths = [
        os.path.join(current_dir, "../.env.local"),
        os.path.join(current_dir, ".env.local"),
        "c:/Users/aditya/Downloads/detectoai (1)/detectoai/.env.local",
    ]
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            print(f"[Voice Detector] Loading env from: {os.path.abspath(env_path)}")
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        os.environ[key.strip()] = val.strip()
            break

    # Load Spectra-AASIST3 from HuggingFace
    try:
        from huggingface_hub import hf_hub_download
        print("[Voice Detector] Fetching model.py from HF Hub (lab260/Spectra-AASIST3)...")
        model_file_path = hf_hub_download(repo_id="lab260/Spectra-AASIST3", filename="model.py")
        model_dir = os.path.dirname(model_file_path)
        
        if model_dir not in sys.path:
            sys.path.append(model_dir)
            
        from model import SpectraAASIST3
        
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[Voice Detector] Loading model onto device: {device}...")
        model = SpectraAASIST3.from_pretrained("lab260/Spectra-AASIST3")
        model.to(device)
        model.eval()
        print("[Voice Detector] Model loaded successfully.")
    except Exception as e:
        print(f"[Voice Detector] CRITICAL: Failed to load Spectra-AASIST3 model: {e}")
        model = None

# Automatically load the model at startup / import
load_model_and_env()

@router.post("/voice-detector")
async def detect_voice(audio: UploadFile = File(...)):
    global model, device
    
    if not audio:
        raise HTTPException(status_code=400, detail="Audio file is required")
        
    if model is None:
        raise HTTPException(status_code=500, detail="AI model (Spectra-AASIST3) is not loaded on the backend")
        
    try:
        # Read the file bytes
        file_bytes = await audio.read()
        
        # Check size (FastAPI upload size check / 20MB limit handled at Next.js proxy, but check here as well)
        if len(file_bytes) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 20MB.")
        
        # Write to temporary file for librosa to load.
        # This handles multiple audio formats (wav, mp3, ogg, m4a, webm) correctly.
        file_ext = os.path.splitext(audio.filename or "")[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name
            
        try:
            # Load and resample to 16kHz mono
            y, sr = librosa.load(temp_path, sr=16000, mono=True)
        except Exception as load_err:
            print(f"[Voice Detector] Error decoding audio file: {load_err}")
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file or corrupted audio: {str(load_err)}"
            )
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except:
                    pass
        
        # Spectra-AASIST3 expects exactly 64400 samples
        max_len = 64400
        if len(y) > max_len:
            y = y[:max_len]
        else:
            y = np.pad(y, (0, max_len - len(y)), 'constant')
            
        # Run inference
        input_tensor = torch.tensor(y, dtype=torch.float32).unsqueeze(0).to(device)
        
        with torch.no_grad():
            output = model(input_tensor)
            probs = F.softmax(output, dim=1)
            
        # Class 0: Spoof, Class 1: Real (bona fide)
        spoof_prob = float(probs[0][0].item())
        real_prob = float(probs[0][1].item())
        
        is_spoof = (spoof_prob >= 0.5)
        
        if is_spoof:
            # AI Generated / Cloned / Spoofed
            confidence = round(spoof_prob * 100, 1)
            return {
                "voiceType": "AI Generated",
                "confidence": confidence,
                "spoofProbability": round(spoof_prob, 2),
                "riskLevel": "CRITICAL",
                "summary": "Possible AI-generated or cloned voice detected."
            }
        else:
            # Authentic Human Voice
            confidence = round(real_prob * 100, 1)
            return {
                "voiceType": "Human Voice",
                "confidence": confidence,
                "spoofProbability": round(spoof_prob, 2),
                "riskLevel": "LOW",
                "summary": "The uploaded recording appears to be authentic."
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Voice Detector] Inference error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"AI model inference failed: {str(e)}"
        )
