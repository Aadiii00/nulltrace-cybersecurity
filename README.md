# 🛡️ NullTrace — Enterprise Threat Intelligence, AI Forensic Suite & Sentinel EDR

**NullTrace** is a unified, multi-layered cyber defense platform designed to detect, analyze, and neutralize digital threats across endpoints, networks, and web environments. 

It combines a **Next.js 16 SOC Web Control Plane**, a **FastAPI Python AI Backend**, a **Native Desktop EDR Sentinel (`.exe`)** with active ransomware containment, and a **Chrome Extension (V3)** into one coordinated cybersecurity ecosystem.

---

## 🏗️ Platform Ecosystem & Architecture

```
 💻 Desktop Endpoint (NullTrace Sentinel .exe) <─── Telemetry & Alerts ───> 🌐 Next.js SOC Web Portal
 ├── Anti-Ransomware Canary Decoy Shield                                    ├── Fleet Management (/endpoints)
 ├── Instant Process Termination (PID Kill)                                ├── SOC Workbench (/soc-workbench)
 ├── 1-Click Hardware Network Isolation (Netsh)                            ├── AI Malware Sandbox (/malware-analysis)
 └── Windows OS Security Audit                                             ├── Network & Subdomain Tools
                                                                            └── Deepfake & Voice Sentinel
                                       ▲
                                       │ REST / JSON API
                                       ▼
                         🐍 Python FastAPI AI Backend (Port 8000)
                         ├── Hugging Face Local Transformers (Smogy Vision)
                         ├── Static YARA & Malware Heuristic Engine
                         └── Multi-threaded Network Port & Subdomain Scanner
```

---

## ✨ Key Features & Capabilities

### 🛡️ 1. NullTrace Sentinel EDR Agent (Native Desktop Executable `.exe`)
A low-footprint Windows Endpoint Detection and Response agent built using Python & CustomTkinter:
* **💥 Anti-Ransomware Canary Shield:** Drops hidden decoy canary files (`.nulltrace_canary_financial_vault.docx`) in user folders. If any unauthorized process attempts to modify or encrypt these files, Sentinel traps the operation instantly.
* **⚡ Automatic Malicious Process Termination:** Automatically identifies and terminates (`psutil.Process.kill()`) the attacker process PID in milliseconds before data corruption can occur.
* **🚨 Emergency Host Isolation:** Executes 1-click network containment using native Windows Firewall rules (`netsh advfirewall`), blocking all inbound and outbound traffic to halt lateral malware spread while preserving host memory for SOC analysis.
* **🛡️ Windows OS Security & Threat Audit:** Scans critical OS posture vectors: Windows Firewall status, UAC elevation settings, Windows Defender protection state, open network ports, and unauthorized Registry auto-start keys (`HKCU\...\Run`).
* **📊 Hardware & Live Telemetry:** Captures hostname, private IP, MAC address, total RAM, real-time CPU/RAM progress meters, USB drive event insertion logs, and scanned download counters.

---

### 💻 2. SOC Workbench & Incident Investigation (`/soc-workbench`)
An enterprise-grade Security Operations Center triage dashboard for analysts:
* **🔍 Interactive IOC Scanner:** Investigate IP addresses, domain names, file hashes (MD5, SHA-256), and malicious URLs.
* **🛡️ VirusTotal & Threat Intelligence Correlation:** Aggregates reputation scores, vendor detection ratios, WHOIS registry age, SSL certificate validity, and DNS A/MX records.
* **🎯 MITRE ATT&CK Mapping:** Automatically maps detected IOC behaviors to official MITRE ATT&CK Tactics (e.g., *T1486 - Data Encrypted for Impact*, *T1059 - Command & Scripting Interpreter*).
* **🕸️ Graph Correlation Visualizer:** Interactive SVG network topology showing relationships between malware hashes, IP nodes, domain infrastructure, and compromised endpoints.
* **📋 Incident Case Management:** Create, assign, track, and close security incident cases directly inside the platform.

---

### 🌐 3. Fleet Endpoint Control Hub (`/endpoints`)
* **Real-time Device Directory:** Displays all onboarded corporate endpoints with live `ONLINE` / `OFFLINE` heartbeat indicators.
* **Alert Feed & Threat Logs:** Centralized log streaming of all critical events originating from desktop Sentinel agents.

---

### 🧪 4. AI Malware Analysis Sandbox (`/malware-analysis`)
* **Static Binary Inspection:** Drag-and-drop suspicious `.exe`, `.dll`, or document files for automated static analysis.
* **Entropy & Crypter Detection:** Analyzes section entropy scores to flag obfuscated, packed, or encrypted malware samples.
* **YARA Rule Engine:** Matches file binaries against custom YARA rule signatures to categorize threats.

---

### 🔍 5. Network Scanner & Subdomain Discovery (`/network-scan`, `/subdomain-discovery`)
* **Multi-threaded Port Scanner:** Fast TCP port auditing to discover exposed services (SSH, RDP, Database ports).
* **Subdomain Enumeration:** Discovers hidden attack surface subdomains with DNS resolution and HTTP status tracking.

---

### 🖼️ 6. AI Vision & Deepfake Detector (`/voice-detector` / `/detect-image`)
* **Local Neural Classification:** Powered by Hugging Face (`Smogy/SMOGY-Ai-images-detector`) running via PyTorch and `transformers`.
* **Groq Vision Fallback:** Automatic cloud failover to Groq Llama-3 Vision models for rapid inference if local hardware acceleration is unavailable.
* **Probability Confidence Scoring:** Generates detailed breakdown metrics showing human vs. synthetic AI generation likelihood.

---

### 🎙️ 7. Voice Sentinel — Audio Forensics (`/transcribe`)
* **Neural Speech-to-Text:** Converts suspicious voice notes, phone calls, and audio files into text via **Deepgram Nova-2**.
* **Intent & Phishing Analysis:** Evaluates transcripts using **Groq Llama-3** to detect social engineering tactics, urgency pressure, extortion, and voice cloning impersonation.

---

### 🧾 8. Auto Cybercrime Complaint Generator
* Generates pre-formatted official cyber complaint drafts ready for reporting to authorities (e.g., [cybercrime.gov.in](https://cybercrime.gov.in)) or platform abuse desks.

---

### 🧩 9. Chrome Extension (Manifest V3)
* Contextual web browsing protection: highlight text or links on any website to scan immediately for phishing, spam, or scam indicators via right-click context menu.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Web App** | [Next.js 16](https://nextjs.org/) (App Router), React 19, TypeScript, [Tailwind CSS 4](https://tailwindcss.com/), Framer Motion, Lucide Icons |
| **Python AI Backend** | Python 3.11+, FastAPI, Uvicorn, PyTorch, Hugging Face Transformers, Pillow, Librosa, Httpx |
| **Desktop EDR Agent (`.exe`)** | Python, CustomTkinter, PyInstaller, Psutil, Watchdog (Canary Observer), Windows Netsh Firewall API |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, `@supabase/ssr`) |
| **AI Models & Engines** | Google Gemini 2.0 Flash, Groq Llama-3, Deepgram Nova-2, Tesseract.js (OCR), Smogy AI Detector |

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js:** v20.x or higher
* **Python:** 3.10+ (for Backend and Sentinel EDR)
* **API Keys:** Google Gemini, Groq, Deepgram, Supabase

---

### 2. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI & Threat Intelligence Keys
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
VIRUSTOTAL_API_KEY=your_virustotal_api_key
```

---

### 3. Running the Web Application
```bash
# Install NPM packages
npm install

# Start Next.js development server
npm run dev
```
The web dashboard will be available at `http://localhost:3000`.

---

### 4. Running the Python AI Backend
```bash
# Navigate to backend folder
cd backend

# Install Python requirements
pip install -r requirements.txt

# Start FastAPI backend server
python main.py
```
The API server will listen on `http://localhost:8000`.

---

### 5. Running & Building NullTrace Sentinel EDR (`.exe`)

```bash
# Run GUI directly in development
python sentinel/gui.py

# Build standalone Windows Executable (.exe)
python sentinel/build_exe.py
```
The compiled executable will be generated inside `sentinel/dist/NullTraceSentinel.exe`.

---

## 📁 Repository Structure

```text
├── src/
│   ├── app/
│   │   ├── api/                 # Next.js API Routes (Sentinel, SOC, Malware, Deepfake)
│   │   ├── dashboard/           # Main User Dashboard
│   │   ├── endpoints/           # EDR Fleet Telemetry Hub
│   │   ├── soc-workbench/       # Threat Investigation & MITRE ATT&CK Workbench
│   │   ├── malware-analysis/    # AI Malware Sandbox UI
│   │   ├── network-scan/        # Port Scanner UI
│   │   ├── subdomain-discovery/ # Subdomain Enumeration UI
│   │   └── transcribe/          # Voice Sentinel Audio Forensic UI
│   ├── components/              # Shared Cyber UI Components & Navbars
│   └── lib/                     # Database & API Utilities
├── backend/                     # Python FastAPI AI Backend & Scanners
│   ├── main.py                  # API Router Entrypoint
│   ├── malware_analysis.py      # Static Binary Analyzer
│   ├── network_scanner.py       # Port Scanner Module
│   ├── soc_workbench.py         # Threat Intelligence Engine
│   └── voice_detector.py        # Voice Deepfake Classifier
├── sentinel/                    # Native Desktop EDR Agent Source
│   ├── gui.py                   # CustomTkinter GUI Application
│   ├── sentinel_agent.py        # Canary Shield, Process Kill & Netsh Isolation
│   └── build_exe.py             # PyInstaller Build Script
├── extension/                   # Chrome Extension (V3) Source
└── public/                      # Static Assets & Install Scripts
```

---

<p align="center">
  <b>Developed by the NullTrace Engineering Team</b><br>
  <i>Empowering Organizations with Next-Gen AI Forensic & Endpoint Defense</i>
</p>
