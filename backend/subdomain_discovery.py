import re
import time
import httpx
import asyncio
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class SubdomainScanRequest(BaseModel):
    target: str

# In-memory cache to keep response times sub-second on subsequent scans
SCAN_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 3600  # 1 hour cache

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

async def fetch_crt_sh(domain: str) -> List[str]:
    subdomains = set()
    try:
        # crt.sh JSON endpoint
        url = f"https://crt.sh/?q=%.{domain}&output=json"
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url)
            if r.status_code == 200:
                data = r.json()
                for entry in data:
                    name = entry.get("name_value", "")
                    # Names can contain wildcards or multiple entries split by newline
                    for part in name.split("\n"):
                        part = part.strip().lower()
                        if part and not part.startswith("*"):
                            if part.endswith(domain) and part != domain:
                                subdomains.add(part)
    except Exception as e:
        print(f"[Subdomains] crt.sh error: {e}")
    return list(subdomains)

async def fetch_hacker_target(domain: str) -> List[str]:
    subdomains = set()
    try:
        url = f"https://api.hackertarget.com/hostsearch/?q={domain}"
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            if r.status_code == 200:
                lines = r.text.strip().split("\n")
                for line in lines:
                    parts = line.split(",")
                    if parts:
                        sub = parts[0].strip().lower()
                        if sub.endswith(domain) and sub != domain:
                            subdomains.add(sub)
    except Exception as e:
        print(f"[Subdomains] HackerTarget error: {e}")
    return list(subdomains)

async def check_host_live(host: str) -> Dict[str, Any]:
    # Default outputs
    status = "Inactive"
    https = False
    response_code = None
    risk = "Medium"
    
    # Analyze Risk category based on hostname keywords
    # Admin panels
    if any(k in host for k in ["admin", "administrator", "cpanel", "dashboard", "portal"]):
        risk = "High"
    # Dev environments
    elif any(k in host for k in ["dev", "test", "beta", "staging", "demo", "sandbox"]):
        risk = "Medium"
    # Mail services
    elif any(k in host for k in ["mail", "smtp", "imap", "pop3"]):
        risk = "Low"
    else:
        risk = "Medium"

    # Try HTTPS first
    try:
        async with httpx.AsyncClient(timeout=2.0, verify=False) as client:
            r = await client.get(f"https://{host}")
            status = "Live"
            https = True
            response_code = r.status_code
            
            # Reduce risk if secure
            HIGH_TRUST_DOMAINS = {
                "google.com", "gmail.com", "youtube.com", "microsoft.com", "github.com",
                "apple.com", "cloudflare.com", "amazon.com", "netflix.com", "facebook.com",
                "instagram.com", "twitter.com", "linkedin.com", "zoom.us", "wikipedia.org",
                "google.co.in", "google.co.uk", "google.com.sg", "google.ca", "google.de"
            }
            is_high_trust = any(host == td or host.endswith("." + td) for td in HIGH_TRUST_DOMAINS)
            if is_high_trust:
                risk = "Low"
            elif risk == "High":
                risk = "High"  # Admin is still High for regular domains
            elif risk == "Medium":
                risk = "Low"
    except Exception:
        # Fallback to HTTP
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                r = await client.get(f"http://{host}")
                status = "Live"
                https = False
                response_code = r.status_code
                # Unsecured HTTP increases risk
                if risk != "High":
                    risk = "High"
        except Exception:
            status = "Inactive"
            https = False
            response_code = None

    return {
        "host": host,
        "status": status,
        "https": https,
        "response": response_code,
        "risk": risk
    }

@router.post("/api/subdomains")
async def discover_subdomains(body: SubdomainScanRequest):
    target = body.target.strip().lower()
    
    # Remove protocol prefix if entered
    target = re.sub(r'^https?://', '', target).split('/')[0].split(':')[0]
    
    # Extract root domain to scan for subdomains correctly
    target = extract_root_domain(target)
    
    if not target:
        raise HTTPException(status_code=400, detail="Domain name is required")
        
    now = time.time()
    if target in SCAN_CACHE:
        cached = SCAN_CACHE[target]
        if now - cached["cached_at"] < CACHE_TTL:
            return cached["data"]

    # Gather subdomains concurrently
    sub_tasks = [fetch_crt_sh(target), fetch_hacker_target(target)]
    results = await asyncio.gather(*sub_tasks)
    
    # Merge and deduplicate
    all_subs = set()
    for resList in results:
        all_subs.update(resList)
        
    # Cap total discovery count to prevent resource exhaustion / excessive scanning times
    subdomain_list = sorted(list(all_subs))[:60]
    
    if not subdomain_list:
        return {
            "domain": target,
            "totalSubdomains": 0,
            "liveSubdomains": 0,
            "deadSubdomains": 0,
            "subdomains": []
        }

    # Perform concurrent live checks
    check_tasks = [check_host_live(host) for host in subdomain_list]
    scan_results = await asyncio.gather(*check_tasks)
    
    live_count = sum(1 for item in scan_results if item["status"] == "Live")
    dead_count = len(scan_results) - live_count
    
    response_data = {
        "domain": target,
        "totalSubdomains": len(scan_results),
        "liveSubdomains": live_count,
        "deadSubdomains": dead_count,
        "subdomains": scan_results
    }
    
    # Cache scan result
    SCAN_CACHE[target] = {
        "cached_at": now,
        "data": response_data
    }
    
    return response_data
