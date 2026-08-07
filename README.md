<div align="center">

# 🛡️ NullTrace
### AI-Powered Cyber Threat Intelligence & SOC Investigation Platform

Detect • Investigate • Correlate • Respond

<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js"/>
<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript"/>
<img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase"/>
<img src="https://img.shields.io/badge/Python-AI-3776AB?style=for-the-badge&logo=python"/>
<img src="https://img.shields.io/badge/MITRE-ATT%26CK-red?style=for-the-badge"/>

</div>

---

# 📌 Overview

**NullTrace** is an AI-powered Cyber Threat Intelligence and SOC Investigation Platform designed to help security analysts investigate cyber threats from a single dashboard.

Instead of switching between multiple cybersecurity tools, NullTrace combines threat intelligence, website analysis, malware analysis, email intelligence, browser protection, and SOC investigations into one unified platform.

---

# 🚀 Key Features

## 🌐 Website Security Assessment

- Website Risk Analysis
- SSL/TLS Inspection
- WHOIS Lookup
- DNS Intelligence
- Redirect Chain Analysis
- Security Headers
- Domain Reputation
- AI Risk Scoring

---

## 🌍 Network Intelligence

- IP Intelligence
- ASN Lookup
- Open Port Analysis
- Geo Location
- Threat Intelligence
- IOC Investigation
- Infrastructure Correlation

---

## 📧 Email Intelligence

- RFC822 Header Analysis
- SPF/DKIM/DMARC Validation
- Sender Reputation
- Phishing Detection
- URL Extraction
- Attachment Analysis
- AI Email Risk Score

---

## 📸 Screenshot Intelligence

Upload any screenshot to detect:

- Fake Login Pages
- Brand Impersonation
- Scam Websites
- OCR Text Extraction
- QR Code Analysis
- AI Screenshot Analysis

---

## 🦠 AI Malware Analysis

Upload

- EXE
- DLL
- APK
- PDF
- Office Files
- ZIP

Features

- Static Analysis
- AI Malware Detection
- MalConv2 Deep Learning
- YARA Rules
- MITRE ATT&CK Mapping
- Malware Family Detection
- AI Risk Score

---

## 🛡️ AI SOC Investigation Workbench

The central investigation hub.

Features

- IOC Investigation
- Threat Correlation
- MITRE ATT&CK Mapping
- Case Management
- Evidence Collection
- Risk Scoring
- AI Security Assistant
- Incident Timeline
- Report Generation

---

## 🔗 Threat Intelligence

Integrated with

- VirusTotal
- Shodan
- AbuseIPDB
- URLScan
- WHOISXML
- IPinfo
- ThreatFox
- URLHaus
- OpenPhish

---

## 🧩 Browser Extension

NullTrace Shield

Real-time protection against

- Phishing
- Fake Websites
- Scam Pages
- Brand Impersonation
- Malicious URLs

Works with

- Chrome
- Microsoft Edge

---

# 🤖 AI Capabilities

- AI Threat Detection
- Malware Classification
- Threat Correlation
- Risk Prediction
- OCR Intelligence
- AI Investigation Assistant
- Incident Summarization
- Security Report Generation

---

# 🧠 SOC Investigation Workflow

```text
Threat Alert
      │
      ▼
Create Investigation Case
      │
      ▼
Collect Evidence
      │
      ▼
IOC Correlation
      │
      ▼
Threat Intelligence
      │
      ▼
MITRE ATT&CK Mapping
      │
      ▼
Risk Scoring
      │
      ▼
AI Recommendations
      │
      ▼
Generate Report
```

---

# 🏗 Architecture

```text
                  User
                    │
                    ▼
        NullTrace Dashboard (Next.js)
                    │
                    ▼
          Express.js Backend API
                    │
 ┌──────────────────┼──────────────────┐
 │                  │                  │
 ▼                  ▼                  ▼
Threat APIs      AI Engine       Supabase
 │                  │                  │
 ▼                  ▼                  ▼
VirusTotal      LLM + ML        PostgreSQL
Shodan          OCR             Storage
IPinfo          Risk Engine
WHOISXML        MITRE Mapping
```

---

# ⚙ Tech Stack

## Frontend

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- ShadCN UI
- React Flow
- Recharts

---

## Backend

- Node.js
- Express.js
- Python FastAPI

---

## Database

- Supabase PostgreSQL
- Supabase Storage

---

## AI & ML

- Llama 3.1
- MalConv2
- PaddleOCR
- YOLOv11
- LightGBM
- YARA
- FAISS

---

## Threat Intelligence

- VirusTotal
- Shodan
- AbuseIPDB
- URLScan
- WHOISXML
- IPinfo
- ThreatFox
- URLHaus

---

## Security

- MITRE ATT&CK
- OWASP Top 10
- IOC Correlation
- Risk Engine

---

# 📊 Risk Scoring

Each module generates its own intelligent risk score.

Example

```text
Website Risk        62

Network Risk        74

Email Risk          81

Malware Risk        95

Screenshot Risk     88

Overall SOC Score   91
```

---

# 📑 Reports

Generate

- PDF Reports
- JSON Reports
- CSV Reports

Includes

- IOC Details
- MITRE Mapping
- Threat Intelligence
- AI Summary
- Recommendations

---

# 🛠 Installation

Clone

```bash
git clone https://github.com/yourusername/nulltrace.git
```

Install

```bash
npm install
```

Run

```bash
npm run dev
```

Backend

```bash
cd backend

npm install

npm start
```

Python AI Engine

```bash
pip install -r requirements.txt

uvicorn app:app --reload
```

---

# 🔑 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

VIRUSTOTAL_API_KEY=

SHODAN_API_KEY=

WHOISXML_API_KEY=

URLSCAN_API_KEY=

IPINFO_API_KEY=
```

---

# 📷 Screenshots

> Add dashboard screenshots here

- Dashboard
- Website Scanner
- IOC Investigation
- MITRE Mapping
- SOC Workbench
- AI Malware Analysis
- Browser Extension

---

# 🛣 Roadmap

- Cloud SIEM Integration
- SOAR Automation
- Mobile Application
- Threat Hunting Dashboard
- AI Threat Prediction
- Blockchain Evidence Verification
- Enterprise Team Collaboration

---

# 🤝 Contributors

Developed with ❤️ by Team Code-Blooded

---

# 📄 License

MIT License

---

<div align="center">

### ⭐ If you found this project useful, consider giving it a star!

</div>
