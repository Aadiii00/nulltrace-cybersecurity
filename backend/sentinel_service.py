import os
import time
import datetime
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

router = APIRouter(prefix="/api/sentinel", tags=["NullTrace Sentinel Agent"])

# In-memory storage for connected endpoints & telemetry alerts
CONNECTED_DEVICES: Dict[str, Dict[str, Any]] = {}
SENTINEL_ALERTS: List[Dict[str, Any]] = []

# Data Models
class DeviceRegisterRequest(BaseModel):
    deviceId: str
    hostname: str
    username: str
    osVersion: str
    cpuName: Optional[str] = "Intel Core i7 / AMD Ryzen"
    totalRamGb: Optional[float] = 16.0
    publicIp: Optional[str] = "127.0.0.1"
    privateIp: Optional[str] = "192.168.1.100"
    macAddress: Optional[str] = "00:11:22:33:44:55"

class HeartbeatRequest(BaseModel):
    deviceId: str
    cpuPercent: float
    ramPercent: float
    diskPercent: float
    activeThreatsCount: int = 0
    scannedDownloadsCount: int = 0
    usbEventsCount: int = 0

class AlertReportRequest(BaseModel):
    deviceId: str
    hostname: str
    alertType: str  # "Malware Download", "USB Threat", "Suspicious Process", "PowerShell Exploit"
    filename: str
    sha256: str
    riskScore: int
    riskLevel: str
    yaraRules: List[str] = []
    mitreTactics: List[str] = []
    aiSummary: str
    evidenceDetails: Dict[str, Any] = {}

# ── 1. Register Endpoint Device ─────────────────────────────────────────────
@router.post("/register")
async def register_device(req: DeviceRegisterRequest):
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    device = {
        "deviceId": req.deviceId,
        "hostname": req.hostname,
        "username": req.username,
        "osVersion": req.osVersion,
        "cpuName": req.cpuName,
        "totalRamGb": req.totalRamGb,
        "publicIp": req.publicIp,
        "privateIp": req.privateIp,
        "macAddress": req.macAddress,
        "firstSeen": now_iso,
        "lastSeen": now_iso,
        "status": "ONLINE",
        "cpuPercent": 12.5,
        "ramPercent": 42.0,
        "diskPercent": 35.0,
        "activeThreatsCount": 0,
        "scannedDownloadsCount": 0,
        "usbEventsCount": 0,
        "protectionStatus": "ACTIVE",
        "latestAlert": "Sentinel Agent Activated"
    }
    CONNECTED_DEVICES[req.deviceId] = device
    return {"status": "success", "message": f"Device '{req.hostname}' registered with NullTrace Sentinel.", "device": device}

# ── 2. Heartbeat Telemetry (Every 30 Seconds) ────────────────────────────────
@router.post("/heartbeat")
async def receive_heartbeat(req: HeartbeatRequest):
    if req.deviceId not in CONNECTED_DEVICES:
        # Auto-create fallback entry if unregistered
        CONNECTED_DEVICES[req.deviceId] = {
            "deviceId": req.deviceId,
            "hostname": f"PC-{req.deviceId[:6].upper()}",
            "username": "User",
            "osVersion": "Windows 11 Pro 64-bit",
            "firstSeen": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "protectionStatus": "ACTIVE"
        }

    dev = CONNECTED_DEVICES[req.deviceId]
    dev["lastSeen"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    dev["status"] = "ONLINE"
    dev["cpuPercent"] = req.cpuPercent
    dev["ramPercent"] = req.ramPercent
    dev["diskPercent"] = req.diskPercent
    dev["activeThreatsCount"] = req.activeThreatsCount
    dev["scannedDownloadsCount"] = req.scannedDownloadsCount
    dev["usbEventsCount"] = req.usbEventsCount

    return {"status": "success", "lastSeen": dev["lastSeen"]}

# ── 3. Receive Threat Alert & Auto-Create SOC Case ───────────────────────────
@router.post("/alert")
async def receive_alert(req: AlertReportRequest):
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    alert_item = {
        "id": f"ALT-{int(time.time())}",
        "deviceId": req.deviceId,
        "hostname": req.hostname,
        "alertType": req.alertType,
        "filename": req.filename,
        "sha256": req.sha256,
        "riskScore": req.riskScore,
        "riskLevel": req.riskLevel,
        "yaraRules": req.yaraRules,
        "mitreTactics": req.mitreTactics,
        "aiSummary": req.aiSummary,
        "evidenceDetails": req.evidenceDetails,
        "timestamp": now_iso
    }
    SENTINEL_ALERTS.insert(0, alert_item)

    if req.deviceId in CONNECTED_DEVICES:
        CONNECTED_DEVICES[req.deviceId]["latestAlert"] = f"{req.alertType}: {req.filename}"
        if req.riskScore >= 70:
            CONNECTED_DEVICES[req.deviceId]["activeThreatsCount"] += 1

    return {
        "status": "success",
        "alertId": alert_item["id"],
        "message": "Alert reported and queued for SOC investigation."
    }

# ── 4. List Devices for Web Dashboard ─────────────────────────────────────────
@router.get("/devices")
async def list_devices():
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    devices_list = []

    for d_id, d in CONNECTED_DEVICES.items():
        try:
            last_dt = datetime.datetime.fromisoformat(d["lastSeen"].replace("Z", "+00:00"))
            seconds_diff = (now_utc - last_dt).total_seconds()
            d["status"] = "ONLINE" if seconds_diff < 90 else "OFFLINE"
        except Exception:
            d["status"] = "ONLINE"
        devices_list.append(d)

    return {
        "totalDevices": len(devices_list),
        "onlineDevices": sum(1 for d in devices_list if d["status"] == "ONLINE"),
        "totalThreats": sum(d.get("activeThreatsCount", 0) for d in devices_list),
        "totalDownloadsScanned": sum(d.get("scannedDownloadsCount", 0) for d in devices_list),
        "totalUsbEvents": sum(d.get("usbEventsCount", 0) for d in devices_list),
        "devices": devices_list,
        "recentAlerts": SENTINEL_ALERTS[:10]
    }
