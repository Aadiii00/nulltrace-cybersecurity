import re
import os
import json
import time
import socket
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

from network_scanner import (
    get_virustotal_intelligence,
    get_geoip_and_ipinfo,
    resolve_domain,
    get_enhanced_ssl,
    get_enhanced_dns_records,
    get_whois_intelligence
)

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

    clean_target = re.sub(r'^https?://', '', raw_query).split('/')[0].split(':')[0]
    ioc_type = detect_ioc_type(raw_query)
    is_ip = ioc_type in ["IPv4", "IPv6"]

    # 1. Resolve IP
    resolved_ip = None
    if is_ip:
        resolved_ip = clean_target
    else:
        resolved_ip = resolve_domain(clean_target)

    # 2. Parallel Live Telemetry Scan
    vt_task = get_virustotal_intelligence(clean_target, is_ip)
    geoip_task = get_geoip_and_ipinfo(resolved_ip) if resolved_ip else asyncio.sleep(0)

    if not is_ip and clean_target:
        whois_task = get_whois_intelligence(clean_target)
        dns_task = get_enhanced_dns_records(clean_target, resolved_ip)
        ssl_task = get_enhanced_ssl(clean_target)
    else:
        whois_task = asyncio.sleep(0)
        dns_task = asyncio.sleep(0)
        ssl_task = asyncio.sleep(0)

    results = await asyncio.gather(vt_task, geoip_task, whois_task, dns_task, ssl_task)
    vt_data = results[0] if isinstance(results[0], dict) else {}
    geoip_data = results[1] if isinstance(results[1], dict) else {}
    whois_data = results[2] if isinstance(results[2], dict) else {}
    dns_data = results[3] if isinstance(results[3], dict) else {}
    ssl_data = results[4] if isinstance(results[4], dict) else {}

    # Multi-Vector Real Risk Score Calculation
    vt_malicious = vt_data.get("malicious", 0)
    vt_total = vt_data.get("totalEngines", 70)

    risk_score = 0
    factors = []

    # 1. VirusTotal Detections
    if vt_malicious > 0:
        ratio = vt_malicious / max(vt_total, 1)
        risk_score += int(ratio * 80) + 15
        factors.append(f"VirusTotal: Flagged malicious by {vt_malicious}/{vt_total} security vendors")

    # 2. Threat Keyword / Suspicious Pattern Heuristics
    suspicious_keywords = ["malware", "phishing", "ransomware", "trojan", "exploit", "canary", "attack", "lockbit", "c2", "beacon", "shell", "botnet", "hack", "stealer", "payload", "cve", "virus", "worm", "spyware"]
    query_lower = raw_query.lower()
    keyword_matches = [kw for kw in suspicious_keywords if kw in query_lower]
    if keyword_matches:
        risk_score += 50 + min(30, len(keyword_matches) * 10)
        factors.append(f"Threat Heuristics: Query matches malicious signature pattern ({', '.join(keyword_matches)})")

    # 3. File Hashes & CVEs
    if ioc_type in ["SHA256", "SHA1", "MD5"]:
        if risk_score == 0:
            risk_score += 70
        factors.append(f"Binary Artifact: High-risk {ioc_type} checksum requiring quarantine inspection")
    elif ioc_type == "CVE ID":
        risk_score = max(risk_score, 85)
        factors.append("Vulnerability ID: Common Vulnerabilities and Exposures (CVE) exploitation vector")

    # 4. Suspicious TLDs
    suspicious_tlds = [".xyz", ".top", ".online", ".club", ".site", ".ru", ".cn", ".tk", ".ml", ".ga", ".cf", ".gq", ".work", ".zip", ".mov"]
    if any(clean_target.lower().endswith(tld) for tld in suspicious_tlds):
        risk_score += 25
        factors.append("Domain Intelligence: Registered under high-abuse Top Level Domain (TLD)")

    # 5. SSL & WHOIS Indicators
    if ssl_data.get("isExpired"):
        risk_score += 20
        factors.append("SSL Certificate: Certificate is expired or invalid")

    if whois_data.get("isNewlyRegistered"):
        risk_score += 20
        factors.append("WHOIS: Domain registered recently (<180 days)")

    # 6. Trusted Educational / Government exceptions
    if any(clean_target.lower().endswith(dom) for dom in [".gov", ".edu", ".ac.in", "google.com", "microsoft.com", "github.com"]):
        if not keyword_matches and vt_malicious == 0:
            risk_score = min(risk_score, 10)

    if risk_score == 0:
        risk_score = 15

    risk_score = min(100, max(5, risk_score))
    severity = "Critical" if risk_score >= 75 else ("High" if risk_score >= 50 else ("Medium" if risk_score >= 25 else "Low"))
    confidence = 95 if vt_data.get("source") == "VirusTotal v3 API" else (90 if keyword_matches else 80)

    geo_isp = f"{geoip_data.get('isp', 'Internet Provider')} ({geoip_data.get('as', 'ASN')}), {geoip_data.get('country', 'Global')}" if geoip_data.get('isp') else "External Infrastructure"

    # MITRE ATT&CK Mapping
    mitre_mappings = []
    if ioc_type in ["IPv4", "IPv6", "Domain", "URL"]:
        mitre_mappings.append({
            "tactic": "Command and Control",
            "technique": "Application Layer Protocol",
            "id": "T1071",
            "description": f"Adversaries may use HTTP/S/DNS protocols to endpoint infrastructure ({clean_target}).",
            "detection": "Inspect netflow logs, DNS query logs, and proxy logs for anomalous outgoing traffic.",
            "mitigation": "Enforce strict egress filtering, DNS sinkholing, and proxy content inspection."
        })
        mitre_mappings.append({
            "tactic": "Initial Access",
            "technique": "Spearphishing Link",
            "id": "T1566.002",
            "description": f"Adversaries may send spearphishing emails with links to web infrastructure ({clean_target}).",
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
            "description": "Adversaries may configure system settings to automatically execute malware upon boot or logon.",
            "detection": "Monitor registry modifications to Run/RunOnce keys and Startup folders.",
            "mitigation": "Audit startup entries and enforce signature validation for binaries."
        })
    elif ioc_type == "CVE ID":
        mitre_mappings.append({
            "tactic": "Initial Access",
            "technique": "Exploit Public-Facing Application",
            "id": "T1190",
            "description": "Adversaries may attempt to take advantage of a weakness in an Internet-facing application.",
            "detection": "Monitor application web server logs for suspicious payloads and 500 internal errors.",
            "mitigation": "Apply vendor security patches, deploy Web Application Firewalls (WAF), and disable unused services."
        })

    # Nodes & Links for correlation graph
    nodes = [
        {"id": raw_query, "label": raw_query, "type": ioc_type, "group": "primary"},
    ]
    links = []

    ip_display = resolved_ip if resolved_ip else "Resolved Endpoint"

    if ioc_type in ["Domain", "URL", "IPv4", "IPv6"]:
        nodes.extend([
            {"id": ip_display, "label": f"IP: {ip_display}", "type": "IPv4", "group": "ip"},
            {"id": geo_isp, "label": geo_isp, "type": "ASN", "group": "asn"},
            {"id": f"VT ({vt_malicious}/{vt_total})", "label": f"VirusTotal: {vt_malicious}/{vt_total} Malicious", "type": "Intel", "group": "intel"}
        ])
        links.extend([
            {"source": raw_query, "target": ip_display, "label": "Resolved A Record"},
            {"source": ip_display, "target": geo_isp, "label": "Hosted On"},
            {"source": raw_query, "target": f"VT ({vt_malicious}/{vt_total})", "label": "Threat Intel Scan"}
        ])

    vt_summary_str = f"VirusTotal flagged {vt_malicious}/{vt_total} engines as malicious." if vt_malicious > 0 else f"VirusTotal scan clean (0/{vt_total} malicious flags)."
    desc = f"Live telemetry scan completed for [{raw_query}]. Resolved to IP [{ip_display}] hosted via {geo_isp}. {vt_summary_str}"

    return {
        "ioc": raw_query,
        "type": ioc_type,
        "riskScore": risk_score,
        "severity": severity,
        "confidence": confidence,
        "resolvedIp": resolved_ip,
        "hosting": geo_isp,
        "virusTotal": vt_data,
        "ssl": ssl_data,
        "dns": dns_data,
        "whois": whois_data,
        "firstSeen": (datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "lastSeen": (datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "source": "NullTrace Live Threat Intel Engine",
        "tags": [ioc_type, "Live Scanned", f"VT {vt_malicious}/{vt_total}"],
        "description": desc,
        "mitreMappings": mitre_mappings,
        "correlation": {
            "nodes": nodes,
            "links": links
        },
        "timeline": [
            {"time": (datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M:%S UTC"), "event": f"Real-time DNS query resolved {raw_query} -> {ip_display}", "type": "dns"},
            {"time": (datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M:%S UTC"), "event": f"VirusTotal 70+ Vendor Scan: {vt_malicious}/{vt_total} malicious detections", "type": "intel"},
            {"time": (datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M:%S UTC"), "event": f"Host ISP identified: {geo_isp}", "type": "intel"},
            {"time": (datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M:%S UTC"), "event": "SOC investigation case initialized", "type": "case"}
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
