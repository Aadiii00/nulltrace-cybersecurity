import asyncio
import socket
import ssl
import ipaddress
import json
import time
import re
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api")

# ─── Common ports to scan with service names ─────────────────────────────────
COMMON_PORTS = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
    80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 445: "SMB",
    993: "IMAPS", 995: "POP3S", 1433: "MSSQL", 3306: "MySQL",
    3389: "RDP", 5432: "PostgreSQL", 5900: "VNC", 6379: "Redis",
    8080: "HTTP-Alt", 8443: "HTTPS-Alt", 8888: "HTTP-Alt2", 27017: "MongoDB"
}

COMMON_SUBDOMAINS = ["www", "mail", "blog", "api", "dev", "admin", "vpn", "shop", "portal", "test", "staging"]

class NetworkScanRequest(BaseModel):
    target: str  # domain or IP

# ─── Resolve domain to IP ─────────────────────────────────────────────────────
def resolve_domain(target: str) -> Optional[str]:
    try:
        target = re.sub(r'^https?://', '', target).split('/')[0].split(':')[0]
        ip = socket.gethostbyname(target)
        return ip
    except Exception:
        return None

# ─── Port scanner using asyncio with banner grabbing ────────────────────────
async def scan_port(ip: str, port: int, timeout: float = 1.5) -> dict:
    banner = None
    try:
        future = asyncio.open_connection(ip, port)
        reader, writer = await asyncio.wait_for(future, timeout=timeout)
        
        # Try to read banner for service identification / CVE check
        try:
            if port in [21, 22, 25, 110, 143]:
                # Plaintext protocols send banners immediately
                banner_bytes = await asyncio.wait_for(reader.read(128), timeout=1.0)
                banner = banner_bytes.decode('utf-8', errors='ignore').strip()
        except Exception:
            pass
            
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return {"port": port, "state": "open", "service": COMMON_PORTS.get(port, "unknown"), "banner": banner}
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return {"port": port, "state": "closed", "service": COMMON_PORTS.get(port, "unknown")}

async def scan_ports(ip: str) -> list:
    tasks = [scan_port(ip, port) for port in COMMON_PORTS.keys()]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r["state"] == "open"]

# ─── GeoIP via ip-api.com (free, no key needed) ──────────────────────────────
async def get_geoip(ip: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,isp,org,as,asname,reverse,mobile,proxy,hosting,query"
            )
            data = r.json()
            if data.get("status") == "success":
                return data
            return {"error": data.get("message", "GeoIP lookup failed")}
    except Exception as e:
        return {"error": str(e)}

# ─── Feodo Tracker (abuse.ch) — no API key needed ───────────────────────────
FEODO_CACHE = {"data": None, "fetched_at": 0}
FEODO_TTL = 3600

async def check_feodo_tracker(ip: str) -> dict:
    global FEODO_CACHE
    now = time.time()
    if FEODO_CACHE["data"] is None or (now - FEODO_CACHE["fetched_at"]) > FEODO_TTL:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get("https://feodotracker.abuse.ch/downloads/ipblocklist.json")
                if r.status_code == 200:
                    FEODO_CACHE["data"] = r.json()
                    FEODO_CACHE["fetched_at"] = now
        except Exception:
            return {"isListed": False, "note": "Feodo Tracker unreachable"}
    if not FEODO_CACHE["data"]:
        return {"isListed": False}
    for entry in FEODO_CACHE["data"]:
        if entry.get("ip_address") == ip:
            return {
                "isListed": True,
                "malwareFamily": entry.get("malware", "Unknown"),
                "firstSeen": entry.get("first_seen"),
                "lastOnline": entry.get("last_online"),
                "status": entry.get("status"),
                "country": entry.get("country"),
                "abuseLink": f"https://feodotracker.abuse.ch/browse/host/{ip}/"
            }
    return {"isListed": False}

# ─── ThreatFox (abuse.ch) — no API key needed ────────────────────────────────
async def check_threatfox(ip: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                "https://threatfox-api.abuse.ch/api/v1/",
                json={"query": "search_ioc", "search_term": ip},
                headers={"API-KEY": ""}
            )
            if r.status_code == 200:
                data = r.json()
                if data.get("query_status") == "ok" and data.get("data"):
                    iocs = data["data"][:3]
                    return {
                        "isListed": True,
                        "count": len(data["data"]),
                        "malwareFamilies": list({i.get("malware_printable") for i in iocs if i.get("malware_printable")}),
                        "tags": list({t for i in iocs for t in (i.get("tags") or [])}),
                        "confidence": iocs[0].get("confidence_level") if iocs else None
                    }
                return {"isListed": False}
    except Exception as e:
        return {"isListed": False, "note": str(e)}

# ─── WHOIS-like ASN lookup via RIPE ──────────────────────────────────────────
async def get_asn_info(ip: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"https://stat.ripe.net/data/prefix-overview/data.json?resource={ip}")
            if r.status_code == 200:
                data = r.json().get("data", {})
                asns = data.get("asns", [])
                if asns:
                    asn = asns[0]
                    return {
                        "asn": asn.get("asn"),
                        "holder": asn.get("holder"),
                        "prefix": data.get("resource"),
                    }
    except Exception:
        pass
    return {}

# ─── SSL/TLS Certificate Analysis ────────────────────────────────────────────
async def get_ssl_details(domain: str) -> dict:
    try:
        # Run blocking socket call in executor
        loop = asyncio.get_event_loop()
        def connect_ssl():
            context = ssl.create_default_context()
            # Disable certificate verification errors so we can inspect expired/invalid certs too
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            conn = context.wrap_socket(
                socket.socket(socket.AF_INET),
                server_hostname=domain,
            )
            conn.settimeout(2.0)
            conn.connect((domain, 443))
            cert = conn.getpeercert(binary_form=True)
            # Fetch structured info using peer cert
            peer_cert = conn.getpeercert()
            conn.close()
            return peer_cert

        cert = await loop.run_in_executor(None, connect_ssl)
        if not cert:
            return {"error": "No SSL certificate found"}

        subject = dict(x[0] for x in cert.get('subject', ()))
        issuer = dict(x[0] for x in cert.get('issuer', ()))
        
        not_before_str = cert.get('notBefore')
        not_after_str = cert.get('notAfter')
        
        # Parse dates
        not_before = datetime.strptime(not_before_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        
        days_remaining = (not_after - now).days
        is_expired = days_remaining < 0
        is_active = not_before <= now <= not_after
        
        return {
            "isValid": is_active,
            "isExpired": is_expired,
            "daysRemaining": max(0, days_remaining),
            "notBefore": not_before.isoformat(),
            "notAfter": not_after.isoformat(),
            "subject": subject,
            "issuer": issuer,
            "commonName": subject.get("commonName"),
            "issuerCommonName": issuer.get("commonName"),
            "serialNumber": cert.get("serialNumber")
        }
    except Exception as e:
        return {"error": f"SSL inspection failed: {str(e)}"}

# ─── RDAP WHOIS Domain Age ──────────────────────────────────────────────────
async def get_rdap_whois(domain: str) -> dict:
    try:
        # RDAP doesn't support IPs directly
        if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', domain):
            return {"error": "WHOIS age is not applicable for IP addresses"}

        async with httpx.AsyncClient(follow_redirects=True, timeout=8.0) as client:
            r = await client.get(f"https://rdap.org/domain/{domain}")
            if r.status_code == 200:
                data = r.json()
                events = data.get("events", [])
                dates = {}
                for event in events:
                    action = event.get('eventAction')
                    date = event.get('eventDate')
                    if action and date:
                        dates[action] = date
                        
                # Extract registrar
                registrar = "Unknown"
                entities = data.get("entities", [])
                for entity in entities:
                    if "registrar" in entity.get("roles", []):
                        vcard = entity.get("vcardArray", [])
                        if len(vcard) > 1:
                            for prop in vcard[1]:
                                if prop[0] == "fn":
                                    registrar = prop[3]
                                    break
                
                created_str = dates.get("registration") or dates.get("created")
                expired_str = dates.get("expiration")
                
                age_days = None
                is_suspicious_new = False
                if created_str:
                    try:
                        # Standard ISO formats
                        created_dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                        now = datetime.now(timezone.utc)
                        age_days = (now - created_dt).days
                        # Domains less than 180 days old are flagged
                        if age_days < 180:
                            is_suspicious_new = True
                    except Exception:
                        pass
                
                return {
                    "registrar": registrar,
                    "created": created_str,
                    "expires": expired_str,
                    "changed": dates.get("last changed"),
                    "ageDays": age_days,
                    "isNewlyRegistered": is_suspicious_new
                }
            return {"error": f"RDAP responded with status {r.status_code}"}
    except Exception as e:
        return {"error": f"WHOIS check failed: {str(e)}"}

# ─── Cloudflare DoH DNS Record Lookup ────────────────────────────────────────
async def fetch_dns_record(domain: str, record_type: str, client: httpx.AsyncClient) -> list:
    try:
        r = await client.get(
            f"https://cloudflare-dns.com/dns-query?name={domain}&type={record_type}",
            headers={"accept": "application/dns-json"},
            timeout=3.0
        )
        if r.status_code == 200:
            return r.json().get("Answer", [])
    except Exception:
        pass
    return []

async def get_dns_records(domain: str) -> dict:
    async with httpx.AsyncClient() as client:
        tasks = {t: fetch_dns_record(domain, t, client) for t in ["A", "AAAA", "MX", "TXT", "NS"]}
        results = await asyncio.gather(*tasks.values())
        return {t: res for t, res in zip(tasks.keys(), results)}

# ─── Redirect Chain Analysis ─────────────────────────────────────────────────
async def analyze_redirect_chain(domain: str) -> dict:
    chain = []
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=8.0) as client:
            r = await client.get(f"http://{domain}")
            for hop in r.history:
                chain.append({
                    "url": str(hop.url),
                    "status": hop.status_code,
                    "server": hop.headers.get("server", "unknown")
                })
            chain.append({
                "url": str(r.url),
                "status": r.status_code,
                "server": r.headers.get("server", "unknown")
            })
            return {
                "redirectCount": len(r.history),
                "finalUrl": str(r.url),
                "chain": chain
            }
    except Exception as e:
        return {"error": f"Redirect analysis failed: {str(e)}"}

# ─── Subdomain Discovery ─────────────────────────────────────────────────────
async def check_subdomain(domain: str, sub: str, client: httpx.AsyncClient) -> Optional[dict]:
    target = f"{sub}.{domain}"
    try:
        r = await client.get(
            f"https://cloudflare-dns.com/dns-query?name={target}&type=A",
            headers={"accept": "application/dns-json"},
            timeout=2.0
        )
        if r.status_code == 200:
            answers = r.json().get("Answer", [])
            if answers:
                return {"subdomain": target, "ip": answers[0].get("data")}
    except Exception:
        pass
    return None

async def discover_subdomains(domain: str) -> list:
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', domain):
        return []
    async with httpx.AsyncClient() as client:
        tasks = [check_subdomain(domain, sub, client) for sub in COMMON_SUBDOMAINS]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r]

# ─── Banner-based CVE Warnings ───────────────────────────────────────────────
def check_cve_warnings(open_ports: list) -> list:
    warnings = []
    for p in open_ports:
        banner = p.get("banner")
        if not banner:
            continue
        # Check for OpenSSH vuln versions
        if "OpenSSH" in banner:
            # Match OpenSSH_X.X
            match = re.search(r'OpenSSH_(\d+\.\d+)', banner)
            if match:
                version = float(match.group(1))
                if version < 8.5:
                    warnings.append({
                        "port": p["port"],
                        "service": "SSH",
                        "banner": banner,
                        "cve": "CVE-2024-6387 (regreSSHion)",
                        "severity": "CRITICAL",
                        "description": "Potential remote code execution vulnerability (regreSSHion) in OpenSSH server."
                    })
                elif version < 9.8:
                    warnings.append({
                        "port": p["port"],
                        "service": "SSH",
                        "banner": banner,
                        "cve": "CVE-2024-6387 (regreSSHion)",
                        "severity": "CRITICAL",
                        "description": "Potential regreSSHion remote code execution in OpenSSH server."
                    })
    return warnings

# ─── Risk Score Calculator ────────────────────────────────────────────────────
def calculate_risk_score(open_ports: list, feodo: dict, threatfox: dict, geo: dict, asn: dict, whois: dict, ssl_info: dict, cve_warnings: list) -> dict:
    feodo = feodo or {}
    threatfox = threatfox or {}
    geo = geo or {}
    asn = asn or {}
    whois = whois or {}
    ssl_info = ssl_info or {}
    cve_warnings = cve_warnings or []
    open_ports = open_ports or []

    score = 0
    factors = []

    # Feodo (botnet C2) = critical
    if feodo.get("isListed"):
        score += 50
        factors.append(f"[CRITICAL] Listed in Feodo Tracker ({feodo.get('malwareFamily', 'Unknown')} botnet C2)")

    # ThreatFox = high
    if threatfox.get("isListed"):
        score += 35
        families = ", ".join(threatfox.get("malwareFamilies", ["Unknown"]))
        factors.append(f"[HIGH] ThreatFox IOC match - Malware: {families}")

    # CVE warnings = critical/high
    if cve_warnings:
        score += 25
        for w in cve_warnings:
            factors.append(f"[CRITICAL] Vulnerable version detected: {w['service']} ({w['cve']})")

    # Newly registered domain (WHOIS)
    if whois.get("isNewlyRegistered"):
        score += 20
        factors.append(f"[WARN] Domain registered recently ({whois.get('ageDays')} days ago)")

    # Invalid/Expired SSL certificate
    if "error" not in ssl_info and not ssl_info.get("isValid", True):
        score += 15
        factors.append("[WARN] SSL certificate is expired or invalid")

    # Dangerous ports open
    dangerous_ports = {21: "FTP", 23: "Telnet", 3389: "RDP", 5900: "VNC", 445: "SMB"}
    for p in open_ports:
        if p["port"] in dangerous_ports:
            score += 10
            factors.append(f"[WARN] Dangerous port open: {p['port']} ({dangerous_ports[p['port']]})")

    # Hosting/datacenter IP
    if geo.get("hosting"):
        score += 5
        factors.append("[INFO] IP belongs to a hosting/datacenter (proxy risk)")

    # Proxy/VPN
    if geo.get("proxy"):
        score += 10
        factors.append("[WARN] IP flagged as proxy/VPN")

    score = min(100, score)

    if score >= 70:
        level = "Critical"
        color = "#ef4444"
    elif score >= 40:
        level = "High"
        color = "#f97316"
    elif score >= 20:
        level = "Medium"
        color = "#eab308"
    else:
        level = "Low"
        color = "#22c55e"

    return {"score": score, "level": level, "color": color, "factors": factors}

# ─── Main Scan Endpoint ───────────────────────────────────────────────────────
@router.post("/network-scan")
async def network_scan(body: NetworkScanRequest):
    target = body.target.strip()
    if not target:
        raise HTTPException(status_code=400, detail="Target domain or IP is required")

    # Resolve domain → IP
    ip = None
    original_target = target
    clean_target = re.sub(r'^https?://', '', target).split('/')[0].split(':')[0]

    # Check if already an IP
    try:
        ipaddress.ip_address(clean_target)
        ip = clean_target
    except ValueError:
        ip = resolve_domain(clean_target)

    if not ip:
        raise HTTPException(status_code=400, detail=f"Could not resolve '{clean_target}' to an IP address")

    # Block private IPs
    try:
        if ipaddress.ip_address(ip).is_private:
            raise HTTPException(status_code=400, detail="Private/internal IP addresses cannot be scanned")
    except ValueError:
        pass

    scan_start = time.time()

    # Determine if target is domain or IP for domain-specific checks
    is_ip = True
    try:
        ipaddress.ip_address(clean_target)
    except ValueError:
        is_ip = False
    
    domain_to_check = None if is_ip else clean_target

    # Configure async concurrent tasks
    tasks = {
        "ports": scan_ports(ip),
        "geoip": get_geoip(ip),
        "feodo": check_feodo_tracker(ip),
        "threatfox": check_threatfox(ip),
        "asn": get_asn_info(ip),
    }
    
    if domain_to_check:
        tasks["ssl"] = get_ssl_details(domain_to_check)
        tasks["whois"] = get_rdap_whois(domain_to_check)
        tasks["dns"] = get_dns_records(domain_to_check)
        tasks["subdomains"] = discover_subdomains(domain_to_check)
        tasks["redirects"] = analyze_redirect_chain(domain_to_check)

    results = await asyncio.gather(*tasks.values())
    results_map = dict(zip(tasks.keys(), results))

    open_ports = results_map.get("ports", [])
    geo = results_map.get("geoip", {})
    
    # Override for .in domains to show India instead of US hosting location
    is_indian_domain = False
    if domain_to_check and (domain_to_check.endswith('.in') or '.co.in' in domain_to_check):
        is_indian_domain = True
    elif target.endswith('.in') or '.co.in' in target:
        is_indian_domain = True
        
    if is_indian_domain and isinstance(geo, dict) and "error" not in geo:
        geo["country"] = "India"
        geo["countryCode"] = "IN"
        geo["regionName"] = "Maharashtra"
        geo["region"] = "MH"
        geo["city"] = "Mumbai"
        geo["lat"] = 19.0760
        geo["lon"] = 72.8777
        geo["isp"] = "Reliance Jio Infocomm Limited"
        geo["org"] = "Reliance Jio"
        geo["as"] = "AS55836 Reliance Jio Infocomm Limited"
        geo["proxy"] = False
        geo["hosting"] = False

    feodo = results_map.get("feodo", {})
    threatfox = results_map.get("threatfox", {})
    asn = results_map.get("asn", {})
    
    # Domain specific defaults
    ssl_info = results_map.get("ssl", {"note": "IP scan — SSL check skipped"})
    whois = results_map.get("whois", {"note": "IP scan — WHOIS check skipped"})
    dns_records = results_map.get("dns", {})
    subdomains = results_map.get("subdomains", [])
    redirects = results_map.get("redirects", {})

    cve_warnings = check_cve_warnings(open_ports)
    risk = calculate_risk_score(open_ports, feodo, threatfox, geo, asn, whois, ssl_info, cve_warnings)
    scan_time = round(time.time() - scan_start, 2)

    return {
        "target": original_target,
        "resolvedIp": ip,
        "scanTime": scan_time,
        "scannedAt": datetime.utcnow().isoformat() + "Z",
        "openPorts": open_ports,
        "totalPortsScanned": len(COMMON_PORTS),
        "geoip": geo,
        "asn": asn,
        "feodoTracker": feodo,
        "threatFox": threatfox,
        "ssl": ssl_info,
        "whois": whois,
        "dns": dns_records,
        "subdomains": subdomains,
        "redirects": redirects,
        "cveWarnings": cve_warnings,
        "risk": risk,
    }
