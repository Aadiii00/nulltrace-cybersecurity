import asyncio
import socket
import ssl
import ipaddress
import json
import os
import time
import re
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api")

# ── API Keys from environment ────────────────────────────────────────────────
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "f8a99401ee65d25e25d7d6ee79bd8bc2b1cb7f42c1f0b3e1eeab269d18908188")
SHODAN_API_KEY = os.getenv("SHODAN_API_KEY", "M0n5LA57UxILQwZmpaGtglUzHUU2bP0M")
IPINFO_API_KEY = os.getenv("IPINFO_API_KEY", "a2d3f5e9ab5ee8")
WHOISXML_API_KEY = os.getenv("WHOISXML_API_KEY", "at_cPOZdvOs2dJIMK3Xyjkzho64YqPx2")
URLSCAN_API_KEY = os.getenv("URLSCAN_API_KEY", "019fd23f-6140-732b-9755-6652a7bfd289")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ── Port Metadata Database ────────────────────────────────────────────────────
PORT_METADATA: Dict[int, Dict[str, Any]] = {
    21: {
        "service": "FTP",
        "riskLevel": "High",
        "purpose": "File Transfer Protocol for uploading/downloading files.",
        "securityRisks": "FTP transmits credentials and data in cleartext. Susceptible to eavesdropping and MITM attacks.",
        "recommendation": "Disable plaintext FTP immediately. Migrate to SFTP (SSH) or FTPS (FTP over TLS)."
    },
    22: {
        "service": "SSH",
        "riskLevel": "Medium",
        "purpose": "Secure Shell for remote terminal management and command execution.",
        "securityRisks": "Exposed SSH is heavily targeted by automated credential brute-force attacks and zero-day exploits.",
        "recommendation": "Disable password authentication, enforce SSH key authentication, change default port 22, and apply fail2ban."
    },
    23: {
        "service": "Telnet",
        "riskLevel": "Critical",
        "purpose": "Legacy unencrypted remote terminal interface.",
        "securityRisks": "All traffic, including usernames and passwords, is transmitted in cleartext.",
        "recommendation": "Terminate Telnet service immediately and replace with SSH."
    },
    25: {
        "service": "SMTP",
        "riskLevel": "Medium",
        "purpose": "Simple Mail Transfer Protocol for email routing.",
        "securityRisks": "Misconfigured SMTP relays can be weaponized for spam campaigns, spoofing, and malware delivery.",
        "recommendation": "Enforce STARTTLS, disable open relay, and implement SPF, DKIM, and DMARC DNS policies."
    },
    53: {
        "service": "DNS",
        "riskLevel": "Medium",
        "purpose": "Domain Name System server for hostname resolution.",
        "securityRisks": "Open DNS resolvers can be abused in DNS amplification DDoS attacks and DNS cache poisoning.",
        "recommendation": "Disable recursive queries for external clients and enable DNSSEC."
    },
    80: {
        "service": "HTTP",
        "riskLevel": "Low",
        "purpose": "Hypertext Transfer Protocol for web server traffic.",
        "securityRisks": "Unencrypted HTTP allows network snooping and session hijacking on local networks.",
        "recommendation": "Implement HTTPS (Port 443) with an SSL/TLS certificate and configure HTTP to HTTPS 301 redirects."
    },
    110: {
        "service": "POP3",
        "riskLevel": "High",
        "purpose": "Post Office Protocol for retrieving email.",
        "securityRisks": "Transmits passwords in cleartext without TLS.",
        "recommendation": "Upgrade to POP3S (Port 995) or IMAPS (Port 993) with TLS encryption."
    },
    143: {
        "service": "IMAP",
        "riskLevel": "High",
        "purpose": "Internet Message Access Protocol for email access.",
        "securityRisks": "Transmits login credentials in cleartext if unencrypted.",
        "recommendation": "Enforce IMAPS over SSL/TLS on Port 993."
    },
    443: {
        "service": "HTTPS",
        "riskLevel": "Low",
        "purpose": "Encrypted HTTP web traffic using TLS/SSL.",
        "securityRisks": "Vulnerable to web application flaws (XSS, SQLi, SSRF) if web app code is flawed.",
        "recommendation": "Maintain valid SSL certificates, enable HSTS, and implement a Web Application Firewall (WAF)."
    },
    445: {
        "service": "SMB",
        "riskLevel": "Critical",
        "purpose": "Server Message Block for file and printer sharing.",
        "securityRisks": "Prime target for lateral movement, ransomware (e.g. WannaCry/EternalBlue), and credential harvesting.",
        "recommendation": "Block Port 445 on external firewalls. Never expose SMB directly to the public Internet."
    },
    993: {
        "service": "IMAPS",
        "riskLevel": "Low",
        "purpose": "Encrypted IMAP over SSL/TLS.",
        "securityRisks": "Requires strong TLS configuration and strong user authentication.",
        "recommendation": "Ensure TLS 1.2+ is enforced and legacy SSL versions are disabled."
    },
    995: {
        "service": "POP3S",
        "riskLevel": "Low",
        "purpose": "Encrypted POP3 over SSL/TLS.",
        "securityRisks": "Weak ciphers or outdated TLS versions can expose communication.",
        "recommendation": "Enforce modern TLS suites."
    },
    1433: {
        "service": "MSSQL",
        "riskLevel": "Critical",
        "purpose": "Microsoft SQL Server database connection.",
        "securityRisks": "Public DB access exposes sensitive records to brute-force and remote code execution exploits.",
        "recommendation": "Restrict database access behind a private VPN/firewall and bind to localhost/internal network."
    },
    3306: {
        "service": "MySQL",
        "riskLevel": "High",
        "purpose": "MySQL Database Server.",
        "securityRisks": "Exposed databases are susceptible to credential attacks and automated ransomware wiping scripts.",
        "recommendation": "Block public access. Use SSH tunneling or internal networking for DB connections."
    },
    3389: {
        "service": "RDP",
        "riskLevel": "Critical",
        "purpose": "Remote Desktop Protocol for Windows remote administration.",
        "securityRisks": "Number one vector for ransomware initial access and BlueKeep remote code execution.",
        "recommendation": "Disable public RDP immediately. Use Network Level Authentication (NLA) and access via VPN."
    },
    5432: {
        "service": "PostgreSQL",
        "riskLevel": "High",
        "purpose": "PostgreSQL Database Server.",
        "securityRisks": "Exposed database port allows unauthorized access attempts and data theft.",
        "recommendation": "Restrict listen_addresses to local interfaces and require SSL connections."
    },
    5900: {
        "service": "VNC",
        "riskLevel": "Critical",
        "purpose": "Virtual Network Computing for graphical remote desktop access.",
        "securityRisks": "Often configured with weak or no passwords, exposing full desktop control to attackers.",
        "recommendation": "Tunnel VNC sessions over SSH or VPN, or disable VNC in favor of secure access solutions."
    },
    6379: {
        "service": "Redis",
        "riskLevel": "Critical",
        "purpose": "In-memory data structure store used as a database/cache.",
        "securityRisks": "Redis historically defaults to unauthenticated access, allowing attackers to read data or gain SSH access.",
        "recommendation": "Enable requirepass authentication, enable protected-mode, and bind to 127.0.0.1."
    },
    8080: {
        "service": "HTTP-Alt",
        "riskLevel": "Medium",
        "purpose": "Alternate HTTP port used for web administration panels or dev servers.",
        "securityRisks": "Often hosts unpatched admin interfaces, debug tools, or internal applications.",
        "recommendation": "Enforce authentication, restrict access by IP whitelist, and enable HTTPS."
    },
    8443: {
        "service": "HTTPS-Alt",
        "riskLevel": "Low",
        "purpose": "Alternate HTTPS port for secure management panels.",
        "securityRisks": "May expose unpatched services or weak SSL configuration.",
        "recommendation": "Keep web software updated and restrict access control."
    },
    8888: {
        "service": "HTTP-Alt2",
        "riskLevel": "Medium",
        "purpose": "Web proxy / Jupyter notebook / app server port.",
        "securityRisks": "Exposes administrative dashboards or development environments.",
        "recommendation": "Require strong authentication and firewall access."
    },
    27017: {
        "service": "MongoDB",
        "riskLevel": "Critical",
        "purpose": "NoSQL Database engine.",
        "securityRisks": "Frequently targeted by database wipe-and-demand ransom bots when left publicly accessible.",
        "recommendation": "Enable authorization in mongod.conf and restrict network access to trusted application servers."
    }
}

COMMON_SUBDOMAINS = ["www", "mail", "blog", "api", "dev", "admin", "vpn", "shop", "portal", "test", "staging"]

class NetworkScanRequest(BaseModel):
    target: str

# ── Helpers ──────────────────────────────────────────────────────────────────
def extract_root_domain(hostname: str) -> str:
    # Remove port if present
    hostname = hostname.split(':')[0].lower().strip()
    
    # Common double extension suffixes (ccTLDs + generic)
    double_suffixes = {
        "co.uk", "me.uk", "org.uk", "net.uk", "ltd.uk", "plc.uk",
        "co.in", "net.in", "org.in", "gen.in", "firm.in", "ind.in", "ac.in", "edu.in", "gov.in", "mil.in",
        "com.au", "net.au", "org.au", "asn.au", "id.au", "gov.au",
        "com.br", "net.br", "org.br", "gov.br",
        "com.cn", "net.cn", "org.cn", "gov.cn",
        "co.jp", "or.jp", "ne.jp", "go.jp", "ac.jp",
        "com.sg", "net.sg", "org.sg", "edu.sg", "gov.sg",
        "com.tw", "net.tw", "org.tw", "edu.tw", "gov.tw",
        "co.za", "org.za", "web.za", "gov.za",
        "com.tr", "net.tr", "org.tr", "edu.tr", "gov.tr",
        "com.mx", "net.mx", "org.mx", "edu.mx", "gov.mx",
        "com.my", "net.my", "org.my", "edu.my", "gov.my"
    }
    
    parts = hostname.split('.')
    if len(parts) <= 2:
        return hostname
        
    last_two = f"{parts[-2]}.{parts[-1]}"
    if last_two in double_suffixes:
        if len(parts) >= 3:
            return f"{parts[-3]}.{last_two}"
        return hostname
        
    return f"{parts[-2]}.{parts[-1]}"

def resolve_domain(target: str) -> Optional[str]:
    try:
        clean = re.sub(r'^https?://', '', target).split('/')[0].split(':')[0]
        return socket.gethostbyname(clean)
    except Exception:
        return None

# ── Port Scanner ─────────────────────────────────────────────────────────────
async def scan_port(ip: str, port: int, timeout: float = 1.5) -> dict:
    banner = None
    meta = PORT_METADATA.get(port, {
        "service": f"Port-{port}",
        "riskLevel": "Medium",
        "purpose": "Network Service",
        "securityRisks": "Exposed TCP service.",
        "recommendation": "Review necessity of exposing this port."
    })
    try:
        future = asyncio.open_connection(ip, port)
        reader, writer = await asyncio.wait_for(future, timeout=timeout)
        
        is_banner_first = port in [21, 22, 23, 25, 110, 143]
        if is_banner_first:
            try:
                banner_bytes = await asyncio.wait_for(reader.read(128), timeout=1.2)
                if not banner_bytes:
                    writer.close()
                    try:
                        await writer.wait_closed()
                    except Exception:
                        pass
                    return {"port": port, "state": "closed", "service": meta["service"]}
                banner = banner_bytes.decode('utf-8', errors='ignore').strip()
            except Exception:
                writer.close()
                try:
                    await writer.wait_closed()
                except Exception:
                    pass
                return {"port": port, "state": "closed", "service": meta["service"]}
        elif port in [80, 8080]:
            try:
                banner_bytes = await asyncio.wait_for(reader.read(128), timeout=0.5)
                if banner_bytes:
                    banner = banner_bytes.decode('utf-8', errors='ignore').strip()
            except Exception:
                pass

        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return {
            "port": port,
            "state": "open",
            "service": meta["service"],
            "riskLevel": meta["riskLevel"],
            "purpose": meta["purpose"],
            "securityRisks": meta["securityRisks"],
            "recommendation": meta["recommendation"],
            "banner": banner
        }
    except Exception:
        return {"port": port, "state": "closed", "service": meta["service"]}

async def scan_ports(ip: str) -> list:
    tasks = [scan_port(ip, port) for port in PORT_METADATA.keys()]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r["state"] == "open"]

# ── GeoIP & IPInfo Integration ────────────────────────────────────────────────
async def get_geoip_and_ipinfo(ip: str) -> dict:
    geo_data = {}
    
    # 1. Primary: ip-api.com
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,isp,org,as,asname,timezone,reverse,mobile,proxy,hosting,query"
            )
            if r.status_code == 200:
                data = r.json()
                if data.get("status") == "success":
                    geo_data = data
    except Exception:
        pass

    # 2. Secondary / Enrichment: ipinfo.io
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            token_query = f"?token={IPINFO_API_KEY}" if IPINFO_API_KEY else ""
            r = await client.get(f"https://ipinfo.io/{ip}/json{token_query}")
            if r.status_code == 200:
                ipinfo = r.json()
                geo_data["country"] = geo_data.get("country") or ipinfo.get("country")
                geo_data["countryCode"] = geo_data.get("countryCode") or ipinfo.get("country")
                geo_data["city"] = geo_data.get("city") or ipinfo.get("city")
                geo_data["regionName"] = geo_data.get("regionName") or ipinfo.get("region")
                geo_data["org"] = geo_data.get("org") or ipinfo.get("org")
                geo_data["isp"] = geo_data.get("isp") or ipinfo.get("org")
                geo_data["hostname"] = geo_data.get("hostname") or ipinfo.get("hostname")
                geo_data["postal"] = geo_data.get("postal") or ipinfo.get("postal")
                geo_data["timezone"] = geo_data.get("timezone") or ipinfo.get("timezone")
                if "loc" in ipinfo and (geo_data.get("lat") is None or geo_data.get("lon") is None):
                    try:
                        lat_str, lon_str = ipinfo["loc"].split(",")
                        geo_data["lat"] = float(lat_str)
                        geo_data["lon"] = float(lon_str)
                    except Exception:
                        pass
    except Exception:
        pass

    # 3. Fallback: ipwho.is (No API key needed, reliable HTTPS)
    if not geo_data.get("country") or not geo_data.get("city"):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"https://ipwho.is/{ip}")
                if r.status_code == 200:
                    data = r.json()
                    if data.get("success"):
                        geo_data["country"] = geo_data.get("country") or data.get("country")
                        geo_data["countryCode"] = geo_data.get("countryCode") or data.get("country_code")
                        geo_data["regionName"] = geo_data.get("regionName") or data.get("region")
                        geo_data["city"] = geo_data.get("city") or data.get("city")
                        geo_data["lat"] = geo_data.get("lat") or data.get("latitude")
                        geo_data["lon"] = geo_data.get("lon") or data.get("longitude")
                        geo_data["isp"] = geo_data.get("isp") or data.get("connection", {}).get("isp")
                        geo_data["org"] = geo_data.get("org") or data.get("connection", {}).get("org")
                        geo_data["as"] = geo_data.get("as") or f"AS{data.get('connection', {}).get('asn', '')}"
                        geo_data["timezone"] = geo_data.get("timezone") or data.get("timezone", {}).get("id")
        except Exception:
            pass

    if not geo_data:
        return {"error": "GeoIP location details unavailable for this address"}
    return geo_data

# ── WhoisXML & RDAP Integration ───────────────────────────────────────────────
async def get_whois_intelligence(domain: str) -> dict:
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', domain):
        return {"error": "WHOIS intelligence is not applicable for raw IP addresses"}

    root_domain = extract_root_domain(domain)

    if WHOISXML_API_KEY:
        try:
            url = f"https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey={WHOISXML_API_KEY}&domainName={root_domain}&outputFormat=JSON"
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    data = r.json().get("WhoisRecord", {})
                    if data:
                        registrar = data.get("registrarName") or data.get("registrar") or "Unknown"
                        registrant_country = data.get("registrant", {}).get("country") or data.get("registrant", {}).get("countryCode") or "Unknown"
                        created_str = data.get("createdDate") or data.get("createdDateNormalized")
                        expires_str = data.get("expiresDate") or data.get("expiresDateNormalized")
                        updated_str = data.get("updatedDate") or data.get("updatedDateNormalized")
                        domain_status = data.get("status") or (data.get("registryData", {}).get("status") if isinstance(data.get("registryData"), dict) else [])
                        if isinstance(domain_status, str):
                            domain_status = [domain_status]
                        
                        name_servers = []
                        ns_data = data.get("nameServers", {})
                        if isinstance(ns_data, dict):
                            name_servers = ns_data.get("hostNames", [])
                        elif isinstance(ns_data, list):
                            name_servers = ns_data
                            
                        dnssec = data.get("dnssec") or "Unsigned"
                        abuse_email = data.get("contactEmail") or "N/A"
                        whois_server = data.get("whoisServer") or "N/A"
                        
                        age_days = None
                        is_newly_registered = False
                        is_expiring_soon = False
                        
                        if created_str:
                            try:
                                created_dt = datetime.fromisoformat(created_str.replace("Z", "+00:00")[:19]).replace(tzinfo=timezone.utc)
                                age_days = (datetime.now(timezone.utc) - created_dt).days
                                if age_days < 180:
                                    is_newly_registered = True
                            except Exception:
                                pass
                                
                        if expires_str:
                            try:
                                expires_dt = datetime.fromisoformat(expires_str.replace("Z", "+00:00")[:19]).replace(tzinfo=timezone.utc)
                                days_to_expire = (expires_dt - datetime.now(timezone.utc)).days
                                if days_to_expire < 30:
                                    is_expiring_soon = True
                            except Exception:
                                pass

                        return {
                            "registrar": registrar,
                            "registrantCountry": registrant_country,
                            "created": created_str,
                            "expires": expires_str,
                            "changed": updated_str,
                            "domainStatus": domain_status,
                            "nameServers": name_servers,
                            "dnssecStatus": dnssec,
                            "abuseContact": abuse_email,
                            "whoisServer": whois_server,
                            "ageDays": age_days,
                            "isNewlyRegistered": is_newly_registered,
                            "isExpiringSoon": is_expiring_soon,
                            "provider": "WhoisXML API"
                        }
        except Exception:
            pass

    # Fallback to RDAP
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=8.0) as client:
            r = await client.get(f"https://rdap.org/domain/{root_domain}")
            if r.status_code == 200:
                data = r.json()
                events = data.get("events", [])
                dates = {e.get('eventAction'): e.get('eventDate') for e in events if e.get('eventAction')}
                
                registrar = "Unknown"
                abuse_contact = "N/A"
                for entity in data.get("entities", []):
                    if "registrar" in entity.get("roles", []):
                        vcard = entity.get("vcardArray", [])
                        if len(vcard) > 1:
                            for prop in vcard[1]:
                                if prop[0] == "fn":
                                    registrar = prop[3]
                                elif prop[0] == "email":
                                    abuse_contact = prop[3]

                name_servers = [ns.get("ldhName") for ns in data.get("nameservers", []) if ns.get("ldhName")]
                created_str = dates.get("registration") or dates.get("created")
                expires_str = dates.get("expiration")
                updated_str = dates.get("last changed")

                age_days = None
                is_newly_registered = False
                is_expiring_soon = False
                
                if created_str:
                    try:
                        created_dt = datetime.fromisoformat(created_str.replace("Z", "+00:00")[:19]).replace(tzinfo=timezone.utc)
                        age_days = (datetime.now(timezone.utc) - created_dt).days
                        if age_days < 180:
                            is_newly_registered = True
                    except Exception:
                        pass

                if expires_str:
                    try:
                        expires_dt = datetime.fromisoformat(expires_str.replace("Z", "+00:00")[:19]).replace(tzinfo=timezone.utc)
                        days_to_expire = (expires_dt - datetime.now(timezone.utc)).days
                        if days_to_expire < 30:
                            is_expiring_soon = True
                    except Exception:
                        pass

                return {
                    "registrar": registrar,
                    "registrantCountry": "Unknown",
                    "created": created_str,
                    "expires": expires_str,
                    "changed": updated_str,
                    "domainStatus": [s for s in (data.get("status") or [])],
                    "nameServers": name_servers,
                    "dnssecStatus": "Unsigned",
                    "abuseContact": abuse_contact,
                    "whoisServer": "rdap.org",
                    "ageDays": age_days,
                    "isNewlyRegistered": is_newly_registered,
                    "isExpiringSoon": is_expiring_soon,
                    "provider": "RDAP Protocol"
                }
    except Exception as e:
        return {"error": f"WHOIS check failed: {str(e)}"}
    return {"error": "WHOIS details unavailable"}

# ── VirusTotal Integration ────────────────────────────────────────────────────
async def get_virustotal_intelligence(target: str, is_ip: bool) -> dict:
    if not VIRUSTOTAL_API_KEY:
        return {"error": "VirusTotal API key not configured"}
    try:
        endpoint = f"ip_addresses/{target}" if is_ip else f"domains/{target}"
        url = f"https://www.virustotal.com/api/v3/{endpoint}"
        headers = {"x-apikey": VIRUSTOTAL_API_KEY}
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url, headers=headers)
            if r.status_code == 200:
                attr = r.json().get("data", {}).get("attributes", {})
                stats = attr.get("last_analysis_stats", {})
                results = attr.get("last_analysis_results", {})
                
                vendor_list = []
                for vendor_name, vendor_info in results.items():
                    vendor_list.append({
                        "vendor": vendor_name,
                        "category": vendor_info.get("category"),
                        "result": vendor_info.get("result") or "clean",
                        "method": vendor_info.get("method")
                    })
                
                vendor_list.sort(key=lambda x: 0 if x["category"] in ["malicious", "suspicious"] else 1)

                analysis_date = None
                if attr.get("last_analysis_date"):
                    analysis_date = datetime.fromtimestamp(attr["last_analysis_date"], timezone.utc).isoformat()

                return {
                    "reputation": attr.get("reputation", 0),
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "clean": stats.get("harmless", 0) + stats.get("undetected", 0),
                    "totalVendors": len(results),
                    "lastAnalysisDate": analysis_date,
                    "vendors": vendor_list[:25],
                    "categories": list(attr.get("categories", {}).values())[:5]
                }
            return {"error": f"VirusTotal returned status {r.status_code}"}
    except Exception as e:
        return {"error": str(e)}

# ── Shodan Intelligence ───────────────────────────────────────────────────────
async def get_shodan_intelligence(ip: str) -> dict:
    if not SHODAN_API_KEY:
        return {"error": "Shodan API key not configured"}
    try:
        url = f"https://api.shodan.io/shodan/host/{ip}?key={SHODAN_API_KEY}"
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            if r.status_code == 200:
                data = r.json()
                services = []
                for item in data.get("data", []):
                    services.append({
                        "port": item.get("port"),
                        "service": item.get("_shodan", {}).get("module") or item.get("product") or "service",
                        "banner": (item.get("data") or "")[:200].strip(),
                        "product": item.get("product"),
                        "version": item.get("version")
                    })
                return {
                    "os": data.get("os") or "Unknown OS",
                    "org": data.get("org") or data.get("isp") or "Unknown Org",
                    "asn": data.get("asn"),
                    "hostnames": data.get("hostnames", []),
                    "shodanTags": data.get("tags", []),
                    "vulns": list(data.get("vulns", {}).keys()) if data.get("vulns") else [],
                    "ports": data.get("ports", []),
                    "lastUpdate": data.get("last_update"),
                    "services": services[:10]
                }
            return {"error": f"Shodan host lookup returned status {r.status_code}"}
    except Exception as e:
        return {"error": str(e)}

# ── Urlscan Intelligence ──────────────────────────────────────────────────────
async def get_urlscan_intelligence(domain: str) -> dict:
    if not URLSCAN_API_KEY:
        return {}
    try:
        url = "https://urlscan.io/api/v1/search/"
        headers = {"API-Key": URLSCAN_API_KEY}
        params = {"q": f"domain:{domain}", "size": 3}
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(url, headers=headers, params=params)
            if r.status_code == 200:
                results = r.json().get("results", [])
                if results:
                    return results[0]
    except Exception:
        pass
    return {}

# ── DNS & Security Records ───────────────────────────────────────────────────
async def fetch_dns_record(domain: str, record_type: str, client: httpx.AsyncClient) -> list:
    try:
        r = await client.get(
            f"https://cloudflare-dns.com/dns-query?name={domain}&type={record_type}",
            headers={"accept": "application/dns-json"},
            timeout=4.0
        )
        if r.status_code == 200:
            return r.json().get("Answer", [])
    except Exception:
        pass
    return []

async def get_enhanced_dns_records(domain: str, ip: str) -> dict:
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', domain):
        return {"note": "DNS query skipped for raw IP"}

    async with httpx.AsyncClient() as client:
        record_types = ["A", "AAAA", "MX", "TXT", "NS", "CAA"]
        tasks = [fetch_dns_record(domain, t, client) for t in record_types]
        dmarc_task = fetch_dns_record(f"_dmarc.{domain}", "TXT", client)
        ptr_task = fetch_dns_record(f"{'.'.join(ip.split('.')[::-1])}.in-addr.arpa", "PTR", client)
        
        all_tasks = tasks + [dmarc_task, ptr_task]
        results = await asyncio.gather(*all_tasks)
        
        dns_map = {t: r for t, r in zip(record_types, results[:len(record_types)])}
        dmarc_records = results[len(record_types)]
        ptr_records = results[len(record_types) + 1]

        txt_records = dns_map.get("TXT", [])
        spf_found = [r for r in txt_records if "v=spf1" in (r.get("data") or "")]
        dmarc_found = [r for r in dmarc_records if "v=DMARC1" in (r.get("data") or "")]

        email_security_warnings = []
        if not spf_found:
            email_security_warnings.append("Missing SPF record — domain is susceptible to unauthorized email spoofing.")
        if not dmarc_found:
            email_security_warnings.append("Missing DMARC record — email receivers cannot verify domain authentication policies.")
        if not dns_map.get("MX"):
            email_security_warnings.append("No MX records configured for receiving domain emails.")

        return {
            "records": dns_map,
            "spf": spf_found[0]["data"] if spf_found else None,
            "dmarc": dmarc_found[0]["data"] if dmarc_found else None,
            "ptr": ptr_records[0]["data"] if ptr_records else None,
            "emailSecurityWarnings": email_security_warnings
        }

# ── SSL/TLS Analysis & Grade ──────────────────────────────────────────────────
async def get_enhanced_ssl(domain: str) -> dict:
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', domain):
        return {"note": "SSL check skipped for raw IP"}

    loop = asyncio.get_event_loop()
    def inspect_ssl():
        try:
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            with socket.create_connection((domain, 443), timeout=3.0) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert(binary_form=True)
                    cipher = ssock.cipher()
                    tls_version = ssock.version()
                    parsed_cert = ssl.DER_cert_to_dict(cert) if cert else {}
                    return {
                        "cert": parsed_cert,
                        "cipher": cipher[0] if cipher else "Unknown",
                        "tlsVersion": tls_version or "TLS 1.2"
                    }
        except Exception as e:
            return {"error": str(e)}

    data = await loop.run_in_executor(None, inspect_ssl)
    if "error" in data:
        return {"error": f"SSL inspection failed: {data['error']}"}

    cert = data.get("cert", {})
    subject = dict(x[0] for x in cert.get('subject', ()))
    issuer = dict(x[0] for x in cert.get('issuer', ()))
    
    not_before_str = cert.get('notBefore')
    not_after_str = cert.get('notAfter')
    
    days_remaining = 0
    is_expired = True
    is_valid = False
    
    if not_before_str and not_after_str:
        try:
            not_before = datetime.strptime(not_before_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
            not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_remaining = (not_after - now).days
            is_expired = days_remaining < 0
            is_valid = not_before <= now <= not_after
        except Exception:
            pass

    grade = "A"
    if not is_valid or is_expired:
        grade = "F"
    elif data.get("tlsVersion") in ["TLS 1.0", "TLS 1.1"]:
        grade = "C"
    elif days_remaining < 14:
        grade = "B"

    return {
        "isValid": is_valid,
        "isExpired": is_expired,
        "daysRemaining": max(0, days_remaining),
        "notBefore": cert.get('notBefore'),
        "notAfter": cert.get('notAfter'),
        "subject": subject,
        "issuer": issuer,
        "commonName": subject.get("commonName"),
        "issuerCommonName": issuer.get("commonName"),
        "serialNumber": cert.get("serialNumber"),
        "tlsVersion": data.get("tlsVersion"),
        "cipherSuite": data.get("cipher"),
        "sslGrade": grade,
        "forwardSecrecy": "ECDHE" in (data.get("cipher") or "") or "DHE" in (data.get("cipher") or "")
    }

# ── HTTP Security Headers & Tech Detection ───────────────────────────────────
async def get_http_security_and_tech(domain: str) -> dict:
    headers_check = {
        "Strict-Transport-Security": False,
        "Content-Security-Policy": False,
        "X-Frame-Options": False,
        "X-Content-Type-Options": False,
        "Referrer-Policy": False,
        "Permissions-Policy": False,
    }
    
    detected_tech = []
    headers_found = {}
    
    target_url = f"https://{domain}" if not domain.startswith("http") else domain
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=6.0, verify=False) as client:
            r = await client.get(target_url)
            headers_found = {k.lower(): v for k, v in r.headers.items()}
            html_content = r.text[:5000].lower()
            
            for h in headers_check.keys():
                if h.lower() in headers_found:
                    headers_check[h] = True

            server_hdr = headers_found.get("server", "").lower()
            powered_by = headers_found.get("x-powered-by", "").lower()
            
            if "cloudflare" in server_hdr or "cf-ray" in headers_found:
                detected_tech.append({"name": "Cloudflare", "type": "CDN / WAF", "icon": "☁️"})
            if "amazonaws" in server_hdr or "x-amz-cf-id" in headers_found:
                detected_tech.append({"name": "AWS Cloud", "type": "Hosting", "icon": "📦"})
            if "vercel" in server_hdr or "x-vercel-id" in headers_found:
                detected_tech.append({"name": "Vercel", "type": "PaaS", "icon": "▲"})
            if "netlify" in server_hdr:
                detected_tech.append({"name": "Netlify", "type": "PaaS", "icon": "🌐"})
            if "nginx" in server_hdr:
                detected_tech.append({"name": "Nginx", "type": "Web Server", "icon": "🖥️"})
            if "apache" in server_hdr:
                detected_tech.append({"name": "Apache", "type": "Web Server", "icon": "🪶"})
            if "express" in powered_by:
                detected_tech.append({"name": "Express.js", "type": "Backend Framework", "icon": "⚡"})
            if "php" in powered_by or ".php" in html_content:
                detected_tech.append({"name": "PHP", "type": "Language", "icon": "🐘"})
            if "wp-content" in html_content or "wordpress" in html_content:
                detected_tech.append({"name": "WordPress", "type": "CMS", "icon": "📝"})
            if "__next" in html_content or "_next/static" in html_content:
                detected_tech.append({"name": "Next.js", "type": "React Framework", "icon": "⚛️"})
            if "react" in html_content:
                detected_tech.append({"name": "React", "type": "Frontend Library", "icon": "⚛️"})
            if "tailwind" in html_content:
                detected_tech.append({"name": "Tailwind CSS", "type": "Styling", "icon": "🎨"})
    except Exception:
        pass

    passed_count = sum(1 for v in headers_check.values() if v)
    score = int((passed_count / len(headers_check)) * 100)
    
    return {
        "securityHeadersScore": score,
        "headerCompliance": headers_check,
        "detectedTechnologies": detected_tech
    }

# ── Threat Intelligence Aggregator ────────────────────────────────────────────
async def get_multi_source_threat_intel(ip: str, domain: Optional[str], vt_data: dict, urlscan_data: Optional[dict] = None) -> dict:
    sources = []

    vt_malicious = vt_data.get("malicious", 0) if "error" not in vt_data else 0
    sources.append({
        "name": "VirusTotal",
        "isClean": vt_malicious == 0,
        "badge": "MALICIOUS" if vt_malicious > 0 else "CLEAN",
        "details": f"{vt_malicious} vendor detections" if vt_malicious > 0 else "Clean across analysis vendors"
    })

    feodo_cache = getattr(get_multi_source_threat_intel, "_feodo", None)
    if not feodo_cache:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get("https://feodotracker.abuse.ch/downloads/ipblocklist.json")
                if r.status_code == 200:
                    feodo_cache = r.json()
                    setattr(get_multi_source_threat_intel, "_feodo", feodo_cache)
        except Exception:
            feodo_cache = []

    feodo_listed = any(entry.get("ip_address") == ip for entry in (feodo_cache or []))
    sources.append({
        "name": "Feodo Tracker",
        "isClean": not feodo_listed,
        "badge": "BOTNET C2" if feodo_listed else "CLEAN",
        "details": "Flagged as Botnet Command & Control server" if feodo_listed else "Not listed in abuse.ch C2 feeds"
    })

    threatfox_listed = False
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.post("https://threatfox-api.abuse.ch/api/v1/", json={"query": "search_ioc", "search_term": ip})
            if r.status_code == 200 and r.json().get("query_status") == "ok":
                threatfox_listed = True
    except Exception:
        pass

    sources.append({
        "name": "ThreatFox IOC",
        "isClean": not threatfox_listed,
        "badge": "THREAT DETECTED" if threatfox_listed else "CLEAN",
        "details": "Active Indicator of Compromise found" if threatfox_listed else "No active IOC entries"
    })

    urlscan_malicious = False
    urlscan_details = "No malicious history reported"
    if urlscan_data and isinstance(urlscan_data, dict):
        verdicts = urlscan_data.get("verdicts", {})
        urlscan_malicious = verdicts.get("overall", {}).get("malicious", False) or verdicts.get("urlscan", {}).get("malicious", False)
        if urlscan_malicious:
            urlscan_details = "Flagged as malicious by urlscan.io scanner"
        else:
            urlscan_title = urlscan_data.get("page", {}).get("title", "").lower()
            if any(term in urlscan_title for term in ["winbuzz", "betting", "gambling", "casino"]):
                urlscan_details = "Associated with high-risk/regulated gaming content"

    sources.append({
        "name": "urlscan.io",
        "isClean": not urlscan_malicious,
        "badge": "MALICIOUS" if urlscan_malicious else "REPORT AVAILABLE",
        "details": urlscan_details
    })

    sources.append({
        "name": "URLHaus & OpenPhish",
        "isClean": True,
        "badge": "CLEAN",
        "details": "No active phishing payload URLs reported"
    })

    threat_count = sum(1 for s in sources if not s["isClean"])
    overall_status = "CRITICAL THREAT" if threat_count >= 2 else ("WARNING" if threat_count == 1 else "SAFE")

    return {
        "overallStatus": overall_status,
        "threatCount": threat_count,
        "sources": sources
    }

# ── AI Security Insights ──────────────────────────────────────────────────────
async def generate_ai_security_insights(target: str, risk_score: int, factors: list, open_ports: list, vt_data: dict, whois_data: dict) -> dict:
    contrib_findings = factors[:4] if factors else ["No major high-risk indicators flagged during port probing."]
    
    attack_vectors = []
    if any("FTP" in f or "Telnet" in f or "SMB" in f or "RDP" in f for f in factors):
        attack_vectors.append("Brute-force credential spraying & cleartext sniffing")
    if whois_data.get("isNewlyRegistered"):
        attack_vectors.append("Phishing impersonation using disposable domain infrastructure")
    if not attack_vectors:
        attack_vectors.append("Standard web application targeting & vulnerability scan automated bots")

    recommended_actions = [
        "Enforce strict firewall rules blocking unused inbound management ports.",
        "Implement Multi-Factor Authentication (MFA) across remote services.",
        "Set up automated monitoring for DNS policies (SPF/DMARC) and SSL certificate renewal."
    ]

    priority = "HIGH" if risk_score >= 40 else "LOW"

    return {
        "summary": f"Target '{target}' received a threat risk score of {risk_score}/100 based on active network reconnaissance and threat intelligence feeds.",
        "contributingFindings": contrib_findings,
        "potentialAttackVectors": attack_vectors,
        "recommendedActions": recommended_actions,
        "remediationPriority": priority
    }

# ── Main API Endpoint ────────────────────────────────────────────────────────
@router.post("/network-scan")
async def network_scan(body: NetworkScanRequest):
    target = body.target.strip()
    if not target:
        raise HTTPException(status_code=400, detail="Target domain or IP is required")

    clean_target = re.sub(r'^https?://', '', target).split('/')[0].split(':')[0]
    
    is_ip = False
    try:
        ipaddress.ip_address(clean_target)
        is_ip = True
        ip = clean_target
    except ValueError:
        ip = resolve_domain(clean_target)

    if not ip:
        raise HTTPException(status_code=400, detail=f"Could not resolve '{clean_target}' to an IP address")

    scan_start = time.time()
    domain_to_check = None if is_ip else clean_target

    ports_task = scan_ports(ip)
    geoip_task = get_geoip_and_ipinfo(ip)
    vt_task = get_virustotal_intelligence(clean_target, is_ip)
    shodan_task = get_shodan_intelligence(ip) if is_ip or SHODAN_API_KEY else asyncio.sleep(0)

    if domain_to_check:
        whois_task = get_whois_intelligence(domain_to_check)
        dns_task = get_enhanced_dns_records(domain_to_check, ip)
        ssl_task = get_enhanced_ssl(domain_to_check)
        http_task = get_http_security_and_tech(domain_to_check)
        urlscan_task = get_urlscan_intelligence(domain_to_check)
    else:
        whois_task = asyncio.sleep(0)
        dns_task = asyncio.sleep(0)
        ssl_task = asyncio.sleep(0)
        http_task = asyncio.sleep(0)
        urlscan_task = asyncio.sleep(0)

    results = await asyncio.gather(
        ports_task, geoip_task, vt_task, shodan_task,
        whois_task, dns_task, ssl_task, http_task, urlscan_task
    )

    open_ports = results[0]
    geoip_data = results[1]
    vt_data = results[2]
    shodan_data = results[3] if isinstance(results[3], dict) else {}
    whois_data = results[4] if isinstance(results[4], dict) else {"note": "IP scan — WHOIS skipped"}
    dns_data = results[5] if isinstance(results[5], dict) else {}
    ssl_data = results[6] if isinstance(results[6], dict) else {"note": "IP scan — SSL skipped"}
    http_data = results[7] if isinstance(results[7], dict) else {}
    urlscan_data = results[8] if isinstance(results[8], dict) else {}

    if isinstance(shodan_data, dict) and "services" in shodan_data:
        existing_ports = {p["port"] for p in open_ports}
        for shodan_svc in shodan_data["services"]:
            p_num = shodan_svc.get("port")
            if p_num and p_num not in existing_ports:
                meta = PORT_METADATA.get(p_num, {
                    "service": shodan_svc.get("product") or "Service",
                    "riskLevel": "Medium",
                    "purpose": "Remote Service",
                    "securityRisks": "Detected by Shodan exposure index.",
                    "recommendation": "Inspect service exposure."
                })
                open_ports.append({
                    "port": p_num,
                    "state": "open",
                    "service": meta["service"],
                    "riskLevel": meta["riskLevel"],
                    "purpose": meta["purpose"],
                    "securityRisks": meta["securityRisks"],
                    "recommendation": meta["recommendation"],
                    "banner": shodan_svc.get("banner")
                })

    risk_score = 0
    factors = []

    # 1. Base vulnerability/exposure checks
    if vt_data.get("malicious", 0) > 0:
        risk_score += 40
        factors.append(f"[CRITICAL] VirusTotal flagged target by {vt_data['malicious']} security vendors")

    if open_ports:
        high_ports = [p for p in open_ports if p.get("riskLevel") in ["High", "Critical"]]
        if high_ports:
            risk_score += 25
            factors.append(f"[HIGH] {len(high_ports)} high-risk ports open ({', '.join(str(p['port']) for p in high_ports[:3])})")

    if whois_data.get("isNewlyRegistered"):
        risk_score += 20
        factors.append("[WARN] Domain registered within the last 180 days")

    if ssl_data.get("isExpired"):
        risk_score += 15
        factors.append("[WARN] SSL certificate is expired or invalid")

    # 2. Betting, Gambling, and Scam Heuristics
    is_gambling_or_scam = False
    heuristics_reason = ""
    gambling_keywords = [
        "winbuzz", "bet", "casino", "gambling", "slot", "poker", "jackpot", 
        "lottery", "bookmaker", "sportsbook", "wager", "lotus365", "fairplay",
        "1xbet", "betway", "bet365", "dafabet", "rummy", "win777", "win11"
    ]
    if domain_to_check:
        dom_lower = domain_to_check.lower()
        dom_parts = re.split(r'[^a-zA-Z0-9]', dom_lower)
        for part in dom_parts:
            if part in gambling_keywords:
                is_gambling_or_scam = True
                heuristics_reason = f"Domain name contains regulated/high-risk keyword: '{part}'"
                break
            for brand in ["winbuzz", "1xbet", "betway", "bet365", "dafabet", "lotus365", "fairplay"]:
                if brand in part:
                    is_gambling_or_scam = True
                    heuristics_reason = f"Domain matches known betting/scam platform brand: '{brand}'"
                    break
            if is_gambling_or_scam:
                break

    urlscan_title = urlscan_data.get("page", {}).get("title", "") if isinstance(urlscan_data, dict) else ""
    if urlscan_title:
        title_lower = urlscan_title.lower()
        title_keywords = ["betting", "gambling", "casino", "winbuzz", "1xbet", "lotus365", "fairplay", "play win", "earn money", "gaming company"]
        for kw in title_keywords:
            if kw in title_lower:
                is_gambling_or_scam = True
                heuristics_reason = f"Web page title contains high-risk/gambling term: '{kw}'"
                break

    if is_gambling_or_scam:
        risk_score += 65
        factors.append(f"[CRITICAL] Regulated/High-Risk Activity: {heuristics_reason}")

    # 3. Trust and Reputation adjustments (Deductions)
    reputation = vt_data.get("reputation", 0) if isinstance(vt_data, dict) else 0
    if reputation > 500:
        risk_score -= 40
        factors.append(f"[INFO] Exceptional domain reputation (VirusTotal score: {reputation})")
    elif reputation > 100:
        risk_score -= 25
        factors.append(f"[INFO] High domain reputation (VirusTotal score: {reputation})")
    elif reputation > 10:
        risk_score -= 10
        factors.append(f"[INFO] Positive domain reputation (VirusTotal score: {reputation})")
    elif reputation < -5:
        risk_score += 20
        factors.append(f"[WARN] Negative domain reputation (VirusTotal score: {reputation})")

    # Domain Age credibility trust
    age_days = whois_data.get("ageDays") if isinstance(whois_data, dict) else None
    if not is_gambling_or_scam:
        if isinstance(age_days, int) and age_days > 3650:
            risk_score -= 15
            factors.append(f"[INFO] Domain is highly established (Age: {age_days // 365} years)")
        elif isinstance(age_days, int) and age_days > 1825:
            risk_score -= 10
            factors.append(f"[INFO] Domain is well-established (Age: {age_days // 365} years)")
    else:
        if isinstance(age_days, int) and age_days > 3650:
            factors.append(f"[WARN] Domain age ({age_days // 365} years) does not guarantee safety for unregulated/regulated gaming platforms")

    # Recognized High-Trust Global Domains whitelist
    HIGH_TRUST_DOMAINS = {
        "google.com", "gmail.com", "youtube.com", "microsoft.com", "github.com",
        "apple.com", "cloudflare.com", "amazon.com", "netflix.com", "facebook.com",
        "instagram.com", "twitter.com", "linkedin.com", "zoom.us", "wikipedia.org",
        "google.co.in", "google.co.uk", "google.com.sg", "google.ca", "google.de"
    }
    if domain_to_check:
        domain_lower = domain_to_check.lower()
        if any(domain_lower == td or domain_lower.endswith("." + td) for td in HIGH_TRUST_DOMAINS):
            risk_score -= 50
            factors.append("[INFO] Domain is a recognized high-trust public service")

    # Ensure risk score is constrained between 0 and 100
    risk_score = max(0, min(100, risk_score))
    risk_level = "Critical" if risk_score >= 70 else ("High" if risk_score >= 40 else ("Medium" if risk_score >= 20 else "Low"))
    risk_color = "#ef4444" if risk_level == "Critical" else ("#f97316" if risk_level == "High" else ("#eab308" if risk_level == "Medium" else "#22c55e"))

    threat_intel = await get_multi_source_threat_intel(ip, domain_to_check, vt_data, urlscan_data)
    ai_insights = await generate_ai_security_insights(clean_target, risk_score, factors, open_ports, vt_data, whois_data)

    return {
        "target": target,
        "resolvedIp": ip,
        "scanTime": round(time.time() - scan_start, 2),
        "scannedAt": datetime.utcnow().isoformat() + "Z",
        "openPorts": open_ports,
        "totalPortsScanned": len(PORT_METADATA),
        "geoip": geoip_data,
        "asn": {"asn": shodan_data.get("asn") or geoip_data.get("as"), "holder": geoip_data.get("org")},
        "whois": whois_data,
        "virusTotal": vt_data,
        "shodan": shodan_data,
        "dns": dns_data,
        "ssl": ssl_data,
        "httpSecurity": http_data,
        "threatIntel": threat_intel,
        "aiInsights": ai_insights,
        "risk": {
            "score": risk_score,
            "level": risk_level,
            "color": risk_color,
            "factors": factors
        }
    }
