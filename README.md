# 🛡️ Nulltrace — Cyber Sentinel Intelligence

**Nulltrace** is an advanced, AI-powered threat detection ecosystem designed to identify, analyze, and neutralize digital threats across the web. From deceptive messages and phishing URLs to recruitment fraud and social engineering, Nulltrace provides real-time protection via a sleek dashboard and a powerful Chrome Extension.

![Nulltrace Banner](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070)

---

## 🚀 Key Features

### 🌐 Intelligence Dashboard
- **Spam Detector:** Instantly flag marketing spam and unsolicited bulk messages.
- **Phishing URL Scanner:** Deep-link analysis for typosquatting, redirect chains, and malicious domains.
- **Fake Job Identifier:** Verify internship and job offers against known recruitment fraud patterns.
- **Email Analyzer:** Scan headers and content for sophisticated social engineering.
- **Screenshot Scanner:** OCR-powered threat detection for WhatsApp, Instagram, and Gmail screenshots.
- **OTP Scam Shield:** Identify tactics used to coerce users into sharing secret codes.
- **🎙️ Voice Sentinel:** Neural speech-to-text transcription with automated forensic threat analysis on voice messages and audio recordings.
- **⚡ Automation Workflows:** Event-driven n8n pipelines that trigger threat reports, alerts, and notifications automatically.
- **🧾 Auto Complaint Generator:** Instantly generate a ready-to-file cybercrime complaint and a formal email draft straight from any scan result.

### 🎙️ Voice Sentinel (New)
Nulltrace can now analyze **voice messages and audio recordings** for social engineering, phishing, and fraud — not just text.

- **Live Capture:** Record audio directly in the browser using your microphone and get instant threat analysis.
- **Forensic Upload:** Upload existing audio files (MP3, WAV, M4A, WebM, OGG, FLAC — up to 25MB) for deep inspection.
- **Neural Transcription:** Powered by **Deepgram Nova-2** with smart formatting and punctuation for high-accuracy STT (speech-to-text).
- **Automated Threat Analysis:** Transcripts are immediately piped into the **Cyber Sentinel** (Gemini 2.5 Flash) engine, which scans for:
  - Urgency and fear tactics
  - OTP / financial fraud scripts
  - Impersonation and deepfake audio patterns
  - Psychological manipulation techniques
- **Full Forensic Report:** Returns a Trust Score (0–100), Risk Level, intent classification, emotional vector analysis, identified threat patterns, and verbatim risky snippets.
- **Scan History:** Voice scans are stored in Supabase alongside other scan types for a unified audit trail.

### 🧩 Chrome Extension (V3)
- **Context-Menu Scanning:** Right-click any selected text on any website to scan with **Cyber Sentinel**.
- **Real-Time Analysis:** Get instant risk assessments and "Cyber Sentinel" reasoning in a sleek overlay.
- **Broad Coverage:** Works across WhatsApp Web, Gmail, and any other social platform.

### ⚡ Automation & Workflows
Nulltrace integrates with **n8n** and other automation platforms to create end-to-end, event-driven intelligence pipelines — no manual intervention required.

| Workflow | Trigger | Action |
|---|---|---|
| **Threat Alert Dispatcher** | High / Critical risk scan result | Sends instant WhatsApp notification via n8n webhook |
| **Daily Digest** | Scheduled (cron) | Aggregates all scans from the last 24h and emails a summary report |
| **Voice Scan Pipeline** | New audio upload | Transcribes → analyzes → logs scan → fires alert if risk ≥ High |
| **Community Flag Relay** | User submits a community threat | Posts to internal Slack / Discord channel for human review |
| **Supabase → n8n Bridge** | Supabase DB insert event | Triggers downstream workflows (notifications, logging, archiving) |

**Tools used in the automation stack:**
- **[n8n](https://n8n.io/)** — self-hostable workflow automation (webhooks, cron, HTTP nodes)
- **WhatsApp Business API** — real-time threat notifications
- **Gmail / SMTP** — digest and alert emails
- **Slack / Discord Webhooks** — team alert channels
- **Supabase Webhooks** — database-event-driven triggers
- **Deepgram** — STT node in the voice pipeline
- **Google Gemini** — AI analysis node in every pipeline

> Workflows are configured in **n8n** by importing the JSON workflow files. Each workflow communicates with Nulltrace via the `/api/analyze` or `/api/transcribe` endpoints.

---

### 🧾 Auto Complaint Generator
Nulltrace doesn't just **detect** threats — it helps you **act on them**. After any High or Critical risk scan, the platform automatically drafts legally-structured complaint documents so you can report the scam in minutes.

**What gets generated:**

| Output | Description |
|---|---|
| **Cybercrime Portal Complaint** | Structured report formatted for [cybercrime.gov.in](https://cybercrime.gov.in) — India's national cybercrime reporting portal. Includes incident summary, evidence excerpts, risk classification, and recommended IPC/IT Act sections. |
| **Email Draft** | Professional complaint email pre-addressed for forwarding to ISPs, banks, HR departments, or platform abuse teams — fully personalisable. |

**Powered by Gemini:** The complaint text is AI-generated from the scan's `analysis`, `patterns`, `riskyParts`, and `riskLevel` fields, so every report is specific to the actual threat — not a generic template.

**Why this matters:** Detection alone is passive. The complaint generator closes the loop and moves users from *awareness* → *action*, enabling real-world consequences for scammers.

---

## 🧠 The "Cyber Sentinel" Engine
Nulltrace is powered by the **Google Gemini 2.5 Flash** model, specifically tuned as our **Cyber Sentinel** intelligence engine. It analyzes:
- **Intent & Emotion:** Understanding the psychological pressure behind a message.
- **Patterns:** Matching against thousands of known fraud signatures.
- **Behavioral Analysis:** Predicting the risk level (Low, Medium, High, Critical).
- **Voice Threats:** Forensic analysis of transcribed audio for vocal social engineering.

---

## 🛠️ Tech Stack
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Framer Motion.
- **Backend:** Supabase (PostgreSQL, Edge Functions).
- **AI Service:** Google Generative AI (Gemini 2.5 Flash).
- **Speech-to-Text:** Deepgram Nova-2 (smart formatting + punctuation).
- **Extension:** Chrome Manifest V3, Vanilla JS/CSS.
- **Icons:** Lucide React.

---

## 🏁 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- A Supabase Project
- A Google AI (Gemini) API Key
- A Deepgram API Key (for Voice Sentinel)

### 2. Configure Environment
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

### 3. Install & Run Dashboard
```bash
npm install
npm run dev
```
Visit `http://localhost:3000` to access the dashboard.

### 4. Install Chrome Extension (Dev Mode)
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **"Developer mode"** (top-right).
3. Click **"Load unpacked"**.
4. Select the `extension` folder in this repository.

---

## 📂 Project Structure
```text
├── extension/          # Chrome Extension (Manifest V3)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/       # Text/URL threat analysis
│   │   │   ├── ocr/           # Screenshot OCR endpoint
│   │   │   └── transcribe/    # Voice Sentinel: Deepgram STT + Gemini analysis
│   │   ├── transcribe/        # Voice Sentinel page (Live Capture & Upload UI)
│   │   └── dashboard/         # Main Intelligence Hub
│   ├── components/
│   │   ├── audio/             # AudioRecorder, AudioUploader, TranscriptViewer
│   │   └── ...                # Other UI Components
│   ├── lib/           # Logic (Gemini, Supabase, Constants)
│   └── types/         # TypeScript Definitions
├── public/            # Static Assets
└── README.md
```

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">Built with ❤️ by the Nulltrace Team to make the internet a safer place.</p>
