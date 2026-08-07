# 🛡️ Nulltrace — Cyber Sentinel Intelligence

**Nulltrace** is a state-of-the-art, AI-powered threat intelligence ecosystem designed to detect, analyze, and neutralize modern digital threats. From sophisticated phishing attempts and fake job offers to deepfake image detection and voice-based social engineering, Nulltrace provides a multi-modal defense layer for the digital age.

[![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq-AI-orange?style=for-the-badge)](https://groq.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)

![Nulltrace Banner](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070)

---

## ✨ Key Features

### 🕵️ Intelligence Dashboard
A high-performance hub for real-time threat analysis:
- **Spam & Phishing Scanner:** Advanced heuristic and AI analysis for URLs and messages.
- **Fake Job Verifier:** Validates recruitment offers against known fraud vectors.
- **OTP Scam Shield:** Detects psychological pressure tactics used in credential theft.
- **Screenshot OCR:** Scan WhatsApp, Instagram, or Email screenshots for hidden threats using Tesseract.js.

### 🎙️ Voice Sentinel (Forensic Audio Analysis)
The world's first integrated voice threat detection system:
- **Neural Transcription:** Powered by **Deepgram Nova-2** for near-perfect accuracy.
- **Sentiment & Intent Analysis:** Uses **Groq Llama-3** to identify fear, urgency, and impersonation in voice messages.
- **Verbatim Indicators:** Highlights exactly which part of the audio sounds suspicious.

### 🖼️ AI Image Detector (Vision Forensic)
Aggressive classification of images to identify AI-generated content:
- **AI vs Human Classifier:** Powered by **Hugging Face (Ateeqq/ai-vs-human-image-detector)** running locally via `transformers` library.
- **Visual Fallback:** Falls back to **Groq Vision** if local inference is unavailable.
- **Confidence Scoring:** Returns a precise probability of AI generation vs human creation.

### 🧾 Auto Complaint Generator
Don't just detect — take action. Nulltrace automatically drafts:
- **Official Cybercrime Reports:** Pre-formatted for platforms like [cybercrime.gov.in](https://cybercrime.gov.in).
- **Abuse Emails:** Professional drafts for ISPs, banks, and platform moderators.

### 🧩 Chrome Extension (V3)
Zero-friction security:
- **Contextual Scanning:** Right-click any text on the web to send it to the Cyber Sentinel engine.
- **Overlay Results:** View risk assessments without leaving your current tab.

---

## 🛠️ Modern Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15+](https://nextjs.org/) (App Router, Server Actions) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, SSR Auth) |
| **Local Inference (Vision)** | [Hugging Face](https://huggingface.co/) (Ateeqq/ai-vs-human-image-detector via local `transformers` pipeline) |
| **Fallback Inference (Vision)** | [Groq](https://groq.com/) (Llama-3-Vision / Scout) |
| **Inference (Logic)** | [Google Gemini 2.0 Flash](https://ai.google.dev/) (Cyber Sentinel Engine) |
| **Speech-to-Text** | [Deepgram Nova-2](https://deepgram.com/) |
| **OCR** | [Tesseract.js](https://tesseract.projectnaptha.com/) |
| **Automation** | [n8n](https://n8n.io/) / Make.com Webhooks |

---

## 🚀 Getting Started

### 1. Requirements
- **Node.js** v20 or higher
- **Supabase** Project (for database and authentication)
- **API Keys:** Groq, Google AI (Gemini), Deepgram

### 2. Environment Setup
Create a `.env.local` file:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# AI Services
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
DEEPGRAM_API_KEY=your_deepgram_key
```

### 3. Installation
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

---

## 📂 Project Navigation
```text
├── src/
│   ├── app/
│   │   ├── api/          # AI logic (analyze, deepfake, transcribe)
│   │   ├── dashboard/    # Main user interface
│   │   └── transcribe/   # Voice Sentinel UI
│   ├── components/       # Premium UI components
│   ├── lib/              # Core logic & external services
│   └── types/            # TypeScript schemas
├── extension/            # Chrome Extension source
└── public/               # Global assets
```

---

<p align="center">
  <b>Built for a safer internet by the Nulltrace Team.</b><br>
  Powered by Next.js, Groq, and Gemini.
</p>
