# 🧠 Learning Nulltrace (DetectoAI)

Welcome to the internal documentation for **Nulltrace** (formerly DetectoAI). This document is written to help new developers or contributors understand *exactly* how this project works, how the pieces connect, and what technologies drive the core features.

## 🎯 What is this project?

Nulltrace is a **Threat Intelligence Ecosystem**. Its primary goal is to help modern internet users detect and mitigate sophisticated digital scams, including:
- AI-generated images and social engineering
- Phishing URLs and fraudulent job offers
- Voice-cloned audio attacks (vishing)

It is built as a highly robust, "serverless-first" web application using modern AI infrastructure.

---

## 🏗️ Architecture Overview

The system is designed with a **Next.js Frontend** that relies on a network of external APIs and a fast **Python/FastAPI microservice** for specialized tasks.

### 1. The Core (Next.js App Router)
Path: `src/app/`
- The entire project is built on **Next.js 15+** utilizing the App Router and Server Components.
- This allows secure server-side execution when talking to our database or AI APIs (so API keys are never exposed to the client browser).
- Tailwind CSS 4 provides the futuristic, dark "Cyber Sentinel" styling.

### 2. The Database (Supabase)
We use **Supabase** (running PostgreSQL) as our central source of truth.
- **Authentication**: Generates UUIDs for users.
- **`deepfake_scans` table**: Stores logs of what the user scanned, the AI's confidence, and the result.
- **Supabase Storage**: Automatically hosts uploaded images in an accessible CDN (the `deepfake-images` bucket) so the user can see their scan history.

### 3. The Multi-Provider AI Engine
To ensure 100% uptime, the application intelligently routes analysis through different Artificial Intelligence providers depending on the task:

*   **Google Gemini (Flash/Pro)**: The "Cyber Sentinel Engine" used for generalized logic, drafting complaints, and analyzing scam text or URLs (`src/app/api/analyze/route.ts`).
*   **Groq (Llama-3 & Llama-4 Scout)**: Known for insanely fast generation speeds. We use Groq's Vision models as our ultimate visual fallback (`src/lib/groq.ts`) and its text models for quick audio sentiment parsing.
*   **Hugging Face Inference**: Dedicated models specifically trained for niche tasks.

---

## 🛠️ Key Features Breakdown

### Feature 1: AI Image Detection
**How it works under the hood:**
1. A user uploads an image on the Dashboard.
2. Next.js (`src/app/api/deepfake/route.ts`) receives the image and uploads a permanent copy to **Supabase Storage**.
3. It tries to send the image to a local **Python FastAPI** worker (`backend/main.py`).
4. The Python worker runs the Hugging Face `transformers` library locally, classifying the image using `Ateeqq/ai-vs-human-image-detector`.
5. **The Fallback Safety Net**: If the local Python worker fails, the Next.js API gracefully catches the failure and immediately sends the image to **Groq Vision** as a fallback. 
6. A record of the scan (with the image URL) is saved to the database. If it's an AI-generated image, an automated webhook is fired to **Make.com/n8n** for alerting.

### Feature 2: Voice Sentinel
**How it works under the hood:**
1. Users upload a voice note (like a WhatsApp forward).
2. The UI sends it to the server (`/api/transcribe`), which proxies it to **Deepgram Nova-2**. Deepgram creates a highly accurate text transcript of the audio in milliseconds.
3. The transcript is then passed to **Groq**. Groq acts as a behavioral analyst to determine the "Intent" (e.g., sense of urgency, fear, or impersonation tactics often used in voice scams).

### Feature 3: Standard Intelligence Dashboard
- Uses OCR (**Tesseract.js**) to read text from screenshots.
- Passes the text to the logic models (Gemini) to check against known psychological scam patterns.

### Feature 4: The Chrome Extension
Path: `extension/`
- Nulltrace includes a Manifest V3 browser extension.
- This allows a user to highlight text or URLs anywhere on the internet, right click, and have it immediately scanned by the backend API without leaving their current tab.

---

## 💡 Developer Workflow

If you are developing this application, your typical setup looks like this:
1. **Frontend Server**: You run `npm run dev` to start the Next.js application on `localhost:3000`.
2. **Backend Server**: In a separate terminal, you activate the Python virtual environment (`.\venv\Scripts\activate`) and run the local AI integration server using `python main.py` on `localhost:8000`.
3. **Environment Variables**: Everything is glued together by the `.env.local` file containing keys for Groq, Gemini, Deepgram, and Supabase.

By combining hyper-fast APIs (Groq, Deepgram) with specialized architectural models (Hugging Face) and a robust Fallback network, Nulltrace achieves enterprise-grade security threat analysis.
