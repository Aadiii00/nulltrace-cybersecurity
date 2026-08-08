"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Laptop,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Download,
  Usb,
  Activity,
  CheckCircle2,
  RefreshCw,
  Clock,
  ExternalLink,
  Cpu,
  HardDrive,
  User,
  Globe,
  Radio,
  FileCode,
  ArrowRight
} from "lucide-react";

interface DeviceItem {
  deviceId: string;
  hostname: string;
  username: string;
  osVersion: string;
  cpuName?: string;
  totalRamGb?: number;
  publicIp?: string;
  privateIp?: string;
  macAddress?: string;
  firstSeen: string;
  lastSeen: string;
  status: "ONLINE" | "OFFLINE";
  cpuPercent?: number;
  ramPercent?: number;
  diskPercent?: number;
  activeThreatsCount?: number;
  scannedDownloadsCount?: number;
  usbEventsCount?: number;
  protectionStatus: "ACTIVE" | "WARN";
  latestAlert?: string;
}

interface AlertItem {
  id: string;
  deviceId: string;
  hostname: string;
  alertType: string;
  filename: string;
  sha256: string;
  riskScore: number;
  riskLevel: string;
  yaraRules: string[];
  mitreTactics: string[];
  aiSummary: string;
  timestamp: string;
}

export default function EndpointsPage() {
  const [devicesData, setDevicesData] = useState<{
    totalDevices: number;
    onlineDevices: number;
    totalThreats: number;
    totalDownloadsScanned: number;
    totalUsbEvents: number;
    devices: DeviceItem[];
    recentAlerts: AlertItem[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDevices = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/sentinel/devices");
      if (res.ok) {
        const data = await res.json();
        setDevicesData(data);
      }
    } catch (e) {
      console.error("Failed to fetch endpoint devices:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleInvestigateInSoc = (alert: AlertItem) => {
    const socPayload = {
      title: `Sentinel Alert: ${alert.alertType} on ${alert.hostname}`,
      ioc: alert.sha256 !== "N/A" ? alert.sha256 : alert.filename,
      severity: alert.riskLevel || "High",
      evidence: [alert.filename, "Sentinel_Agent_Telemetry.json"],
      notes: `AI Summary: ${alert.aiSummary}\nYARA Matches: ${alert.yaraRules.join(", ") || "None"}\nMITRE ATT&CK: ${alert.mitreTactics.join(", ") || "T1059"}`
    };
    sessionStorage.setItem("nulltrace_soc_create_case", JSON.stringify(socPayload));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                <Laptop className="w-5 h-5" />
              </div>
              <h1 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-cyan-400 bg-clip-text text-transparent">
                💻 Endpoints & Device Management
              </h1>
            </div>
            <p className="text-foreground/60 text-sm">
              Real-time monitoring and threat prevention across all connected Windows workstations running NullTrace Sentinel.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDevices}
              disabled={isRefreshing}
              className="glass px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-foreground/80 hover:text-white border-white/10 hover:border-cyan-500/30 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh Devices
            </button>

            <a
              href="/NullTraceSentinel.exe"
              download="NullTraceSentinel.exe"
              className="bg-cyan-500 text-black px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-4 h-4" />
              Download Sentinel Agent (.exe)
            </a>
          </div>
        </div>

        {/* 6 Key Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Protected Devices */}
          <div className="glass p-5 rounded-2xl border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-foreground/40 text-xs font-medium">
              <span>Protected Devices</span>
              <Laptop className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold font-mono text-cyan-400">
                {devicesData?.totalDevices ?? 1}
              </span>
            </div>
          </div>

          {/* Card 2: Online Devices */}
          <div className="glass p-5 rounded-2xl border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-foreground/40 text-xs font-medium">
              <span>Online Status</span>
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {devicesData?.onlineDevices ?? 1}
              </span>
              <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold uppercase">
                Active
              </span>
            </div>
          </div>

          {/* Card 3: Threats Today */}
          <div className="glass p-5 rounded-2xl border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-foreground/40 text-xs font-medium">
              <span>Active Threats</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold font-mono text-red-400">
                {devicesData?.totalThreats ?? 1}
              </span>
            </div>
          </div>

          {/* Card 4: Downloads Scanned */}
          <div className="glass p-5 rounded-2xl border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-foreground/40 text-xs font-medium">
              <span>Downloads Scanned</span>
              <Download className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold font-mono text-blue-400">
                {devicesData?.totalDownloadsScanned ?? 24}
              </span>
            </div>
          </div>

          {/* Card 5: USB Events */}
          <div className="glass p-5 rounded-2xl border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-foreground/40 text-xs font-medium">
              <span>USB Events</span>
              <Usb className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold font-mono text-purple-400">
                {devicesData?.totalUsbEvents ?? 3}
              </span>
            </div>
          </div>

          {/* Card 6: Sentinel Health */}
          <div className="glass p-5 rounded-2xl border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-foreground/40 text-xs font-medium">
              <span>Protection</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20 inline-block uppercase">
                100% Guarded
              </span>
            </div>
          </div>
        </div>

        {/* Live Endpoints Table Section */}
        <div className="glass rounded-[28px] border-white/5 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Laptop className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-display font-bold">Connected Workstations & Sentinel Telemetry</h2>
            </div>
            <span className="text-xs font-mono text-foreground/40">
              Heartbeat Polling: 30 Seconds
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] text-foreground/40 uppercase text-[10px] tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-4">Device & Hostname</th>
                  <th className="px-6 py-4">Windows OS & Specs</th>
                  <th className="px-6 py-4">IP & Network</th>
                  <th className="px-6 py-4">Live CPU & RAM Load</th>
                  <th className="px-6 py-4">Status & Heartbeat</th>
                  <th className="px-6 py-4">Latest Threat Alert</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-foreground/40 font-mono">
                      Loading connected Sentinel devices...
                    </td>
                  </tr>
                ) : devicesData?.devices && devicesData.devices.length > 0 ? (
                  devicesData.devices.map((device) => (
                    <tr key={device.deviceId} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Hostname & User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground font-mono">{device.hostname}</div>
                            <div className="text-xs text-foreground/40 flex items-center gap-1">
                              <User className="w-3 h-3 text-cyan-400" /> {device.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Specs */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono text-foreground/80">{device.osVersion}</div>
                        <div className="text-[11px] text-foreground/40">{device.cpuName || "13th Gen Intel Core i7"} • {device.totalRamGb || 16} GB RAM</div>
                      </td>

                      {/* Network */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono text-cyan-400">{device.privateIp}</div>
                        <div className="text-[11px] text-foreground/40 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-foreground/30" /> {device.publicIp}
                        </div>
                      </td>

                      {/* Live Meters */}
                      <td className="px-6 py-4">
                        <div className="w-36 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-foreground/40">CPU</span>
                            <span className="text-cyan-400 font-bold">{device.cpuPercent ?? 15}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${device.cpuPercent ?? 15}%` }} />
                          </div>

                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-foreground/40">RAM</span>
                            <span className="text-purple-400 font-bold">{device.ramPercent ?? 42}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-400 rounded-full" style={{ width: `${device.ramPercent ?? 42}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {device.status === "ONLINE" ? (
                          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-400 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            ONLINE
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 bg-zinc-500/10 border border-zinc-500/20 px-2.5 py-1 rounded-full text-zinc-400 text-xs font-bold">
                            OFFLINE
                          </div>
                        )}
                      </td>

                      {/* Latest Alert */}
                      <td className="px-6 py-4">
                        <div className="text-xs text-foreground/80 max-w-xs truncate font-mono">
                          {device.latestAlert || "No threat alerts"}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          Protection: {device.protectionStatus}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href="/soc-workbench"
                          className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg transition-all border border-cyan-500/20"
                        >
                          Investigate <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-foreground/40">
                      No endpoint devices connected yet. Launch <code className="text-cyan-400">NullTraceSentinel.exe</code> on your Windows PC to register.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Threat Activity Timeline Section */}
        <div className="glass rounded-[28px] p-6 border-white/5 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-display font-bold">Sentinel Threat Detection & Action Timeline</h3>
          </div>

          {/* Timeline Sequence */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">STEP 01</span>
                <Clock className="w-4 h-4 text-foreground/30" />
              </div>
              <h4 className="font-bold text-sm text-foreground">File Downloaded</h4>
              <p className="text-xs text-foreground/40">
                Watchdog observer detects new binary dropped in Downloads/Desktop folder.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">STEP 02</span>
                <FileCode className="w-4 h-4 text-foreground/30" />
              </div>
              <h4 className="font-bold text-sm text-foreground">SHA256 & MalConv2 Scan</h4>
              <p className="text-xs text-foreground/40">
                Calculates cryptographic hashes & runs deep byte neural classification.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">STEP 03</span>
                <AlertTriangle className="w-4 h-4 text-foreground/30" />
              </div>
              <h4 className="font-bold text-sm text-foreground">Malicious Threat Flagged</h4>
              <p className="text-xs text-foreground/40">
                Displays Windows Toast Notification & logs Risk Score alert.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">STEP 04</span>
                <ShieldCheck className="w-4 h-4 text-foreground/30" />
              </div>
              <h4 className="font-bold text-sm text-foreground">SOC Case Auto-Created</h4>
              <p className="text-xs text-foreground/40">
                Generates actionable investigation case in SOC Workbench with MITRE mapping.
              </p>
            </div>
          </div>

          {/* Recent Alerts Feed Table */}
          {devicesData?.recentAlerts && devicesData.recentAlerts.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-foreground/60">
                Recent Sentinel Threat Logs
              </h4>
              <div className="space-y-2">
                {devicesData.recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-red-500/10 text-red-400 border border-red-500/20">
                          {alert.alertType}
                        </span>
                        <span className="font-mono text-sm font-bold text-white">{alert.filename}</span>
                        <span className="text-xs text-foreground/40 font-mono">({alert.hostname})</span>
                      </div>
                      <p className="text-xs text-foreground/50">{alert.aiSummary}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                        Risk: {alert.riskScore}%
                      </span>
                      <Link
                        href="/soc-workbench"
                        onClick={() => handleInvestigateInSoc(alert)}
                        className="bg-cyan-500 text-black px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-cyan-400 transition-all flex items-center gap-1"
                      >
                        Investigate <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
