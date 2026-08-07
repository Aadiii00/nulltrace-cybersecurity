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
            if risk == "High":
                risk = "High"  # Admin is still High
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
