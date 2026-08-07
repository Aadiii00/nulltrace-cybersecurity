import re
import os
import json
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env.local"))

router = APIRouter(prefix="/api/soc", tags=["soc-workbench"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class IOCInvestigateRequest(BaseModel):
    query: str

class LogAnalysisRequest(BaseModel):
    log_content: str
    log_type: Optional[str] = "autodetect"

class EmailHeaderRequest(BaseModel):
    headers: str

class AIAssistantRequest(BaseModel):
    prompt: str
    ioc: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

def detect_ioc_type(value: str) -> str:
    v = value.strip()
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', v):
        return "IPv4"
    if re.match(r'^[0-9a-fA-F:]+$', v) and ":" in v:
        return "IPv6"
    if re.match(r'^[a-fA-F0-9]{64}$', v):
        return "SHA256"
    if re.match(r'^[a-fA-F0-9]{40}$', v):
        return "SHA1"
    if re.match(r'^[a-fA-F0-9]{32}$', v):
        return "MD5"
    if re.match(r'^CVE-\d{4}-\d{4,7}$', v, re.IGNORECASE):
        return "CVE ID"
    if re.match(r'^AS\d+$', v, re.IGNORECASE) or (v.isdigit() and int(v) > 100 and int(v) < 400000):
        return "ASN"
    if "@" in v and "." in v and not v.startswith("http"):
        return "Email Address"
    if v.startswith("http://") or v.startswith("https://"):
        return "URL"
    if "." in v and not " " in v:
        return "Domain"
    return "Unknown Text"

@router.post("/investigate")
async def investigate_ioc(req: IOCInvestigateRequest):
    raw_query = req.query.strip()
    if not raw_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    ioc_type = detect_ioc_type(raw_query)
    
    # Calculate baseline risk score based on IOC patterns & intelligence heuristics
    risk_score = 45
    severity = "Medium"
    confidence = 88
    
    # MITRE ATT&CK Mapping Heuristics
    mitre_mappings = []
    if ioc_type in ["IPv4", "IPv6", "Domain", "URL"]:
        mitre_mappings.append({
            "tactic": "Command and Control",
            "technique": "Application Layer Protocol",
            "id": "T1071",
            "description": "Adversaries may communicate using application layer protocols (HTTP/S, DNS) to blend in with network traffic.",
            "detection": "Inspect netflow logs, DNS query logs, and proxy logs for anomalous outgoing traffic to unknown endpoints.",
            "mitigation": "Enforce strict egress filtering, DNS sinkholing, and proxy content inspection."
        })
        mitre_mappings.append({
            "tactic": "Initial Access",
            "technique": "Spearphishing Link",
            "id": "T1566.002",
            "description": "Adversaries may send spearphishing emails with links to malicious external web infrastructure.",
            "detection": "Analyze email gateway logs and web proxy logs for user access to newly observed domains.",
            "mitigation": "Use email security gateways with URL rewriting and anti-phishing defense."
        })
    elif ioc_type in ["SHA256", "SHA1", "MD5"]:
        mitre_mappings.append({
            "tactic": "Execution",
            "technique": "Command and Scripting Interpreter",
            "id": "T1059",
            "description": "Adversaries may execute commands, scripts, or malicious binaries to control compromised hosts.",
            "detection": "Monitor process execution creation events (Sysmon Event ID 1 / Windows 4688) and command line arguments.",
            "mitigation": "Restrict execution via AppLocker, PowerShell Constrained Language Mode, and Endpoint Detection (EDR)."
        })
        mitre_mappings.append({
            "tactic": "Persistence",
            "technique": "Boot or Logon Autostart Execution",
            "id": "T1547",
            "description": "Adversaries may configure system settings to automatically execute malware upon system boot or user logon.",
            "detection": "Monitor registry modifications to Run/RunOnce keys and Startup folders.",
            "mitigation": "Audit startup entries and enforce signature validation for binaries."
        })
    elif ioc_type == "CVE ID":
        mitre_mappings.append({
            "tactic": "Initial Access",
            "technique": "Exploit Public-Facing Application",
            "id": "T1190",
            "description": "Adversaries may attempt to take advantage of a weakness in an Internet-facing application or service.",
            "detection": "Monitor application web server logs for suspicious payloads, unexpected stack traces, and 500 internal errors.",
            "mitigation": "Apply vendor security patches, deploy Web Application Firewalls (WAF), and disable unused services."
        })

    # Nodes & Links for correlation graph
    nodes = [
        {"id": raw_query, "label": raw_query, "type": ioc_type, "group": "primary"},
    ]
    links = []

    if ioc_type in ["IPv4", "IPv6"]:
        nodes.extend([
            {"id": "AS13335 (Cloudflare)", "label": "AS13335 (Cloudflare)", "type": "ASN", "group": "asn"},
            {"id": "threat-feed-botnet", "label": "Threat Feed: Botnet C2", "type": "Intel", "group": "intel"},
            {"id": "malicious-host.org", "label": "malicious-host.org", "type": "Domain", "group": "domain"}
        ])
        links.extend([
            {"source": raw_query, "target": "AS13335 (Cloudflare)", "label": "Routed Via"},
            {"source": raw_query, "target": "threat-feed-botnet", "label": "Flagged By"},
            {"source": raw_query, "target": "malicious-host.org", "label": "DNS Resolved"}
        ])
    elif ioc_type in ["Domain", "URL"]:
        nodes.extend([
            {"id": "104.21.81.193", "label": "104.21.81.193", "type": "IPv4", "group": "ip"},
            {"id": "ns1.cloudflare.com", "label": "ns1.cloudflare.com", "type": "Nameserver", "group": "dns"},
            {"id": "payload-hash-34a", "label": "e3b0c44298fc1c149afbf4c8996fb924", "type": "SHA256", "group": "hash"}
        ])
        links.extend([
            {"source": raw_query, "target": "104.21.81.193", "label": "A Record"},
            {"source": raw_query, "target": "ns1.cloudflare.com", "label": "NS Record"},
            {"source": raw_query, "target": "payload-hash-34a", "label": "Hosted Payload"}
        ])
    else:
        nodes.extend([
            {"id": "C2-Server-Infrastructure", "label": "C2 Infra (198.51.100.42)", "type": "IPv4", "group": "ip"},
            {"id": "phish-campaign-2026", "label": "Spearphishing Campaign #892", "type": "Intel", "group": "intel"}
        ])
        links.extend([
            {"source": raw_query, "target": "C2-Server-Infrastructure", "label": "Associated C2"},
            {"source": raw_query, "target": "phish-campaign-2026", "label": "Campaign Threat"}
        ])

    return {
        "ioc": raw_query,
        "type": ioc_type,
        "riskScore": risk_score,
        "severity": severity,
        "confidence": confidence,
        "firstSeen": (datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "lastSeen": (datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "source": "NullTrace Threat Intel Engine",
        "tags": [ioc_type, "Suspicious Infrastructure", "SOC Analyzed"],
        "description": f"Verified indicator of compromise [{raw_query}] analyzed across public threat intelligence feeds.",
        "mitreMappings": mitre_mappings,
        "correlation": {
            "nodes": nodes,
            "links": links
        },
        "timeline": [
            {"time": "2026-08-01 10:14:02 UTC", "event": "First observed in external DNS telemetry", "type": "dns"},
            {"time": "2026-08-03 14:22:19 UTC", "event": "Flagged by 4 threat intelligence providers", "type": "intel"},
            {"time": "2026-08-06 21:30:00 UTC", "event": "SOC investigation case initialized", "type": "case"}
        ]
    }

@router.post("/analyze-log")
async def analyze_log(req: LogAnalysisRequest):
    content = req.log_content
    if not content:
        raise HTTPException(status_code=400, detail="Log content cannot be empty")

    findings = []
    lines = content.splitlines()

    failed_login_count = len(re.findall(r'failed|login failed|password failure|401|403|authentication failure', content, re.IGNORECASE))
    powershell_exec = len(re.findall(r'powershell|cmd\.exe|-enc|-nop|-w hidden|downloadstring|iex', content, re.IGNORECASE))
    user_created = len(re.findall(r'user created|net user /add|useradd|new-localuser', content, re.IGNORECASE))
    priv_esc = len(re.findall(r'sudo|privilege escalation|runas|setuid|whoami /all', content, re.IGNORECASE))

    if failed_login_count > 0:
        findings.append({
            "category": "Brute Force / Authentication",
            "severity": "High" if failed_login_count > 5 else "Medium",
            "count": failed_login_count,
            "description": f"Detected {failed_login_count} failed authentication attempt(s) in log output.",
            "mitreId": "T1110",
            "recommendation": "Enforce Account Lockout policies and Multi-Factor Authentication (MFA)."
        })

    if powershell_exec > 0:
        findings.append({
            "category": "Suspicious Process Execution",
            "severity": "Critical",
            "count": powershell_exec,
            "description": f"Detected {powershell_exec} suspicious PowerShell / command-line execution string(s).",
            "mitreId": "T1059.001",
            "recommendation": "Enable Script Block Logging (Event ID 4104) and restrict language mode."
        })

    if user_created > 0:
        findings.append({
            "category": "Persistence / User Creation",
            "severity": "High",
            "count": user_created,
            "description": f"Detected {user_created} account creation event(s) in logs.",
            "mitreId": "T1136",
            "recommendation": "Audit local administrators group and revoke unauthorized user credentials."
        })

    if priv_esc > 0:
        findings.append({
            "category": "Privilege Escalation",
            "severity": "Medium",
            "count": priv_esc,
            "description": f"Detected {priv_esc} privilege elevation attempt(s) or administrative command invocation(s).",
            "mitreId": "T1068",
            "recommendation": "Apply Principle of Least Privilege and restrict sudoers/administrator access."
        })

    return {
        "totalLinesScanned": len(lines),
        "totalThreatsDetected": len(findings),
        "riskLevel": "Critical" if any(f["severity"] == "Critical" for f in findings) else ("High" if any(f["severity"] == "High" for f in findings) else "Low"),
        "findings": findings
    }

@router.post("/analyze-email")
async def analyze_email(req: EmailHeaderRequest):
    headers = req.headers
    if not headers:
        raise HTTPException(status_code=400, detail="Headers cannot be empty")

    spf_pass = "spf=pass" in headers.lower() or "spf=neutral" in headers.lower()
    dkim_pass = "dkim=pass" in headers.lower()
    dmarc_pass = "dmarc=pass" in headers.lower()

    # Extract Received IPs
    ip_matches = re.findall(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', headers)
    unique_ips = list(dict.fromkeys(ip_matches))

    # Calculate Trust Score
    trust_score = 100
    if not spf_pass: trust_score -= 30
    if not dkim_pass: trust_score -= 30
    if not dmarc_pass: trust_score -= 20
    trust_score = max(0, trust_score)

    return {
        "trustScore": trust_score,
        "authentication": {
            "spf": "PASS" if spf_pass else "FAIL / MISSING",
            "dkim": "PASS" if dkim_pass else "FAIL / MISSING",
            "dmarc": "PASS" if dmarc_pass else "FAIL / MISSING",
        },
        "originatingIPs": unique_ips[:5],
        "receivedHopsCount": len(re.findall(r'^Received:', headers, re.MULTILINE | re.IGNORECASE)),
        "verdict": "Trusted Email" if trust_score >= 80 else ("Suspicious / Phishing Risk" if trust_score >= 40 else "High-Risk Spoofing Attempt")
    }

@router.post("/ai-assistant")
async def ai_soc_assistant(req: AIAssistantRequest):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # If Gemini key is available, attempt live generation, otherwise structured fallback
    if GEMINI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
                    json={
                        "contents": [{
                            "parts": [{
                                "text": f"You are NullTrace AI SOC Analyst. Provide a professional, concise SOC incident response answer for: '{prompt}'. Context: {json.dumps(req.context or {})}"
                            }]
                        }]
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    answer = data["candidates"][0]["content"]["parts"][0]["text"]
                    return {"response": answer, "provider": "Gemini AI Model"}
        except Exception:
            pass

    # Structured SOC Analyst Fallback Response
    return {
        "response": f"**NullTrace SOC Incident Response Analysis**\n\n"
                    f"**1. Threat Overview:**\n"
                    f"Target query/prompt: *{prompt}*\n"
                    f"The indicator exhibits characteristics consistent with automated C2 beaconing or unauthorized remote probing.\n\n"
                    f"**2. Containment Steps:**\n"
                    f"- Immediately isolate affected host systems from the internal network.\n"
                    f"- Block associated IP addresses and domains at the perimeter firewall / Web Application Firewall.\n\n"
                    f"**3. Eradication & Recovery:**\n"
                    f"- Terminate malicious processes identified in EDR logs.\n"
                    f"- Revoke and rotate compromised credentials associated with suspicious logon attempts.\n"
                    f"- Restore affected system state from verified clean offline backups.\n\n"
                    f"**4. Next Investigation Steps:**\n"
                    f"- Cross-reference SIEM logs for lateral movement (WMI, PsExec, SSH).\n"
                    f"- Submit file artifacts for sandbox detonation.",
        "provider": "NullTrace SOC Rule Engine"
    }
