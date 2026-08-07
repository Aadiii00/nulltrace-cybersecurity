"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Shield, ShieldAlert, ShieldCheck, Search, AlertTriangle,
  Server, Wifi, MapPin, Activity, Clock, ArrowLeft, RefreshCw,
  CheckCircle, XCircle, Terminal, ChevronDown, ChevronUp, Copy, Check,
  Calendar, Lock
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface PortResult { port: number; state: string; service: string; banner?: string | null; }
interface GeoIP {
  country?: string; countryCode?: string; regionName?: string; city?: string;
  lat?: number; lon?: number; isp?: string; org?: string; as?: string;
  proxy?: boolean; hosting?: boolean; mobile?: boolean; error?: string;
}
interface ThreatCheck {
  isListed: boolean; malwareFamily?: string; malwareFamilies?: string[];
  firstSeen?: string; lastOnline?: string; status?: string;
  country?: string; abuseLink?: string; count?: number;
  tags?: string[]; confidence?: number; note?: string;
}
interface Risk { score: number; level: string; color: string; factors: string[]; }
interface ASN { asn?: number; holder?: string; prefix?: string; }

interface SSLDetails {
  isValid?: boolean;
  isExpired?: boolean;
  daysRemaining?: number;
  notBefore?: string;
  notAfter?: string;
  subject?: Record<string, string>;
  issuer?: Record<string, string>;
  commonName?: string;
  issuerCommonName?: string;
  serialNumber?: string;
  error?: string;
  note?: string;
}

interface WhoisDetails {
  registrar?: string;
  created?: string;
  expires?: string;
  changed?: string;
  ageDays?: number | null;
  isNewlyRegistered?: boolean;
  error?: string;
  note?: string;
}

interface DNSRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DNSRecords {
  A?: DNSRecord[];
  AAAA?: DNSRecord[];
  MX?: DNSRecord[];
  TXT?: DNSRecord[];
  NS?: DNSRecord[];
}

interface Subdomain {
  subdomain: string;
  ip: string;
}

interface RedirectHop {
  url: string;
  status: number;
  server: string;
}

interface RedirectChain {
  redirectCount?: number;
  finalUrl?: string;
  chain?: RedirectHop[];
  error?: string;
}

interface CVEWarning {
  port: number;
  service: string;
  banner: string;
  cve: string;
  severity: string;
  description: string;
}

interface ScanResult {
  target: string;
  resolvedIp: string;
  scanTime: number;
  scannedAt: string;
  openPorts: PortResult[];
  totalPortsScanned: number;
  geoip: GeoIP;
  asn: ASN;
  feodoTracker: ThreatCheck;
  threatFox: ThreatCheck;
  ssl?: SSLDetails;
  whois?: WhoisDetails;
  dns?: DNSRecords;
  subdomains?: Subdomain[];
  redirects?: RedirectChain;
  cveWarnings?: CVEWarning[];
  risk: Risk;
}

const RISK_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  Critical: { bg: "bg-red-950/20", border: "border-red-500/30", text: "text-red-400", glow: "shadow-[0_0_60px_rgba(239,68,68,0.15)]" },
  High:     { bg: "bg-orange-950/20", border: "border-orange-500/30", text: "text-orange-400", glow: "shadow-[0_0_60px_rgba(249,115,22,0.15)]" },
  Medium:   { bg: "bg-yellow-950/20", border: "border-yellow-500/30", text: "text-yellow-400", glow: "shadow-[0_0_60px_rgba(234,179,8,0.15)]" },
  Low:      { bg: "bg-cyan-950/10", border: "border-cyan-500/20", text: "text-cyan-400", glow: "shadow-[0_0_60px_rgba(34,211,238,0.15)]" },
};

const PORT_DANGER: Record<number, string> = {
  21: "FTP — plaintext credentials", 23: "Telnet — unencrypted shell",
  445: "SMB — ransomware vector", 3389: "RDP — brute-force target",
  5900: "VNC — remote desktop exposed", 1433: "MSSQL — DB exposed to internet",
  27017: "MongoDB — often misconfigured", 6379: "Redis — often unauthenticated",
};

export default function NetworkScanPage() {
  const [target, setTarget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllPorts, setShowAllPorts] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleScan = async () => {
    const t = target.trim();
    if (!t) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/network-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const riskStyle = result ? (RISK_STYLES[result.risk.level] || RISK_STYLES.Low) : null;

  return (
    <main className="min-h-screen bg-[#020617] text-white selection:bg-cyan-500/30">
      <Navbar />

      {/* Background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 pt-32 pb-20 px-4 md:px-8 max-w-6xl mx-auto">

        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/30 hover:text-cyan-400 transition-colors mb-10 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Back to Dashboard</span>
        </Link>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-cyan-500/20">
              <Globe className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
                Network <span className="text-cyan-400">Threat Intel</span>
              </h1>
              <p className="text-white/40 text-sm mt-1">Real-time port scan · GeoIP · Botnet C2 · IOC lookup</p>
            </div>
          </div>
          <p className="text-white/50 max-w-2xl leading-relaxed">
            Scan any domain or IP — detect open ports, geolocate the server, and cross-reference against
            <span className="text-cyan-400"> Feodo Tracker</span> botnet C2 lists and <span className="text-cyan-400">ThreatFox</span> IOC database.
            Powered entirely by your Python backend — no paid API keys.
          </p>
        </header>

        {/* Input */}
        <div className="glass rounded-[32px] p-6 border border-white/5 mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleScan()}
                placeholder="Enter domain or IP  (e.g. google.com, 1.2.3.4)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-all font-mono text-sm"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={isLoading || !target.trim()}
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-2xl text-sm uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 shrink-0"
            >
              {isLoading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning...</>
              ) : (
                <><Search className="w-4 h-4" /> Scan</>
              )}
            </button>
          </div>

          {/* Quick examples */}
          <div className="flex flex-wrap gap-2 mt-4">
            {["google.com", "cloudflare.com", "8.8.8.8", "185.220.101.1"].map(ex => (
              <button
                key={ex}
                onClick={() => setTarget(ex)}
                className="px-3 py-1 text-xs font-mono text-white/30 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/30 rounded-lg transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass rounded-[32px] p-12 border border-white/5 flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-cyan-500/20 flex items-center justify-center">
                  <Globe className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-t-2 border-cyan-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-bold text-white text-lg">Running Network Intelligence Scan</p>
                <p className="text-white/40 text-sm mt-2">Probing ports · Checking threat databases · Geolocating IP...</p>
                <p className="text-white/20 text-xs mt-4 font-mono">This may take 15–30 seconds</p>
              </div>
              {/* Animated steps */}
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {[
                  "Resolving domain",
                  "Scanning 22 common ports",
                  "Checking Feodo Tracker (abuse.ch)",
                  "Querying ThreatFox IOC database",
                  "Fetching GeoIP data",
                  "Querying SSL details",
                  "Fetching WHOIS/RDAP registration",
                  "Querying DNS records (A, MX, TXT, NS)",
                  "Performing subdomain discovery",
                  "Analyzing HTTP redirect chains"
                ].map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.25 }}
                    className="flex items-center gap-3 text-xs text-white/30"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-[24px] p-6 border border-red-500/20 bg-red-950/10 flex items-start gap-4"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-400 text-sm">Scan Failed</p>
                <p className="text-white/50 text-xs mt-1">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {result && !isLoading && riskStyle && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Risk Banner */}
              <div className={`rounded-[32px] p-8 border ${riskStyle.bg} ${riskStyle.border} ${riskStyle.glow}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${riskStyle.border}`}>
                      {result.risk.score >= 40
                        ? <ShieldAlert className={`w-8 h-8 ${riskStyle.text}`} />
                        : <ShieldCheck className={`w-8 h-8 ${riskStyle.text}`} />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className={`text-3xl font-black ${riskStyle.text}`}>{result.risk.level} Risk</h2>
                        <span className={`text-5xl font-black ${riskStyle.text} opacity-60`}>{result.risk.score}</span>
                        <span className="text-white/20 text-xl">/100</span>
                      </div>
                      <p className="text-white/50 text-sm font-mono mt-1">{result.target} → {result.resolvedIp}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {result.scanTime}s scan
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      {result.openPorts.length} open ports
                    </div>
                    <button onClick={handleCopy} className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors">
                      {copied ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Export JSON"}
                    </button>
                  </div>
                </div>

                {/* Risk Factors */}
                {result.risk.factors.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {result.risk.factors.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-white/70 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CVE Warnings Banner */}
              {result.cveWarnings && result.cveWarnings.length > 0 && (
                <div className="glass border border-red-500/30 bg-red-950/10 rounded-[24px] p-6 space-y-4">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase tracking-wider">
                    <ShieldAlert className="w-5 h-5" />
                    Vulnerability Warnings Detected ({result.cveWarnings.length})
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {result.cveWarnings.map((warning, i) => (
                      <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-bold text-white">{warning.cve}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                              {warning.severity}
                            </span>
                            <span className="text-white/40 text-xs">Port {warning.port} ({warning.service})</span>
                          </div>
                          <p className="text-white/60 text-xs mt-1.5">{warning.description}</p>
                          {warning.banner && (
                            <div className="mt-2 text-[10px] font-mono text-cyan-400/70 bg-black/40 px-2.5 py-1.5 rounded border border-white/5 inline-block">
                              Banner: {warning.banner}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Resolved IP", value: result.resolvedIp, icon: <Globe className="w-4 h-4" /> },
                  { label: "Open Ports", value: `${result.openPorts.length} / ${result.totalPortsScanned}`, icon: <Terminal className="w-4 h-4" /> },
                  { label: "Feodo C2", value: result.feodoTracker?.isListed ? "⚠️ LISTED" : "✅ Clean", icon: <Shield className="w-4 h-4" /> },
                  { label: "ThreatFox IOCs", value: result.threatFox?.isListed ? `⚠️ ${result.threatFox?.count} matches` : "✅ Clean", icon: <Activity className="w-4 h-4" /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="glass rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center gap-2 text-white/30 text-xs uppercase tracking-widest mb-2">
                      {icon} {label}
                    </div>
                    <p className="font-bold text-white font-mono text-sm break-all">{value}</p>
                  </div>
                ))}
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* GeoIP */}
                <div className="glass rounded-[24px] p-6 border border-white/5">
                  <div className="flex items-center gap-2 mb-5">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">GeoIP Location</h3>
                  </div>
                  {result.geoip.error ? (
                    <p className="text-white/30 text-sm italic">GeoIP lookup failed</p>
                  ) : (
                    <div className="space-y-3">
                      {[
                        ["Country", `${result.geoip.country || "—"} ${result.geoip.countryCode ? `(${result.geoip.countryCode})` : ""}`],
                        ["Region", result.geoip.regionName || "—"],
                        ["City", result.geoip.city || "—"],
                        ["ISP", result.geoip.isp || "—"],
                        ["Organization", result.geoip.org || "—"],
                        ["ASN", result.geoip.as || "—"],
                        ["Coordinates", result.geoip.lat ? `${result.geoip.lat}, ${result.geoip.lon}` : "—"],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between gap-4 text-sm border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                          <span className="text-white/30 shrink-0">{label}</span>
                          <span className="text-white/80 font-mono text-right text-xs">{val}</span>
                        </div>
                      ))}
                      <div className="flex gap-3 mt-3">
                        {result.geoip.proxy && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400">PROXY/VPN</span>}
                        {result.geoip.hosting && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400">HOSTING</span>}
                        {result.geoip.mobile && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400">MOBILE</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* WHOIS Age */}
                <div className="glass rounded-[24px] p-6 border border-white/5">
                  <div className="flex items-center gap-2 mb-5">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">Domain WHOIS / Age</h3>
                  </div>
                  {result.whois?.error || result.whois?.note ? (
                    <p className="text-white/30 text-sm italic">{result.whois?.error || result.whois?.note || "WHOIS details unavailable"}</p>
                  ) : (
                    <div className="space-y-3">
                      {[
                        ["Registrar", result.whois?.registrar || "—"],
                        ["Created Date", result.whois?.created ? new Date(result.whois.created).toLocaleDateString() : "—"],
                        ["Expiration Date", result.whois?.expires ? new Date(result.whois.expires).toLocaleDateString() : "—"],
                        ["Last Updated", result.whois?.changed ? new Date(result.whois.changed).toLocaleDateString() : "—"],
                        ["Domain Age", result.whois?.ageDays != null ? `${result.whois.ageDays} Days` : "—"],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between gap-4 text-sm border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                          <span className="text-white/30 shrink-0">{label}</span>
                          <span className="text-white/80 font-mono text-right text-xs">{val}</span>
                        </div>
                      ))}
                      {result.whois?.isNewlyRegistered && (
                        <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Suspicious Domain Age</p>
                            <p className="text-[10px] text-orange-400/80 mt-0.5">This domain is less than 180 days old. Newly registered domains are frequently used in phishing and malware campaigns.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Threat Intel */}
                <div className="glass rounded-[24px] p-6 border border-white/5 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">Threat Intelligence</h3>
                  </div>

                  {/* Feodo */}
                  <div className={`rounded-2xl p-4 border ${result.feodoTracker?.isListed ? "bg-red-950/20 border-red-500/20" : "bg-white/[0.02] border-white/5"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/40">Feodo Tracker (abuse.ch)</span>
                      {result.feodoTracker?.isListed
                        ? <span className="flex items-center gap-1 text-red-400 text-xs font-bold"><XCircle className="w-3.5 h-3.5" /> LISTED</span>
                        : <span className="flex items-center gap-1 text-green-400 text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> Clean</span>
                      }
                    </div>
                    {result.feodoTracker?.isListed && (
                      <div className="text-xs space-y-1 mt-2">
                        <p className="text-white/60">Malware: <span className="text-red-400 font-bold">{result.feodoTracker?.malwareFamily}</span></p>
                        {result.feodoTracker?.firstSeen && <p className="text-white/40">First seen: {result.feodoTracker?.firstSeen}</p>}
                        {result.feodoTracker?.status && <p className="text-white/40">Status: {result.feodoTracker?.status}</p>}
                      </div>
                    )}
                  </div>

                  {/* ThreatFox */}
                  <div className={`rounded-2xl p-4 border ${result.threatFox?.isListed ? "bg-orange-950/20 border-orange-500/20" : "bg-white/[0.02] border-white/5"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/40">ThreatFox IOC (abuse.ch)</span>
                      {result.threatFox?.isListed
                        ? <span className="flex items-center gap-1 text-orange-400 text-xs font-bold"><XCircle className="w-3.5 h-3.5" /> {result.threatFox?.count} IOCs</span>
                        : <span className="flex items-center gap-1 text-green-400 text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> Clean</span>
                      }
                    </div>
                    {result.threatFox?.isListed && (
                      <div className="text-xs space-y-1 mt-2">
                        {(result.threatFox?.malwareFamilies || []).length > 0 && (
                          <p className="text-white/60">Families: <span className="text-orange-400 font-bold">{result.threatFox?.malwareFamilies?.join(", ")}</span></p>
                        )}
                        {(result.threatFox?.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.threatFox?.tags?.map(t => (
                              <span key={t} className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[10px]">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* SSL Certificate */}
                <div className="glass rounded-[24px] p-6 border border-white/5">
                  <div className="flex items-center gap-2 mb-5">
                    <Lock className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">SSL/TLS Certificate</h3>
                  </div>
                  {result.ssl?.error || result.ssl?.note ? (
                    <p className="text-white/30 text-sm italic">{result.ssl?.error || result.ssl?.note || "SSL details unavailable"}</p>
                  ) : (
                    <div className="space-y-3">
                      {[
                        ["Common Name", result.ssl?.commonName || "—"],
                        ["Issuer Name", result.ssl?.issuerCommonName || "—"],
                        ["Validity Period", result.ssl?.isValid ? "✅ Valid" : "❌ Invalid / Expired"],
                        ["Days Remaining", result.ssl?.daysRemaining != null ? `${result.ssl.daysRemaining} days` : "—"],
                        ["Valid From", result.ssl?.notBefore ? new Date(result.ssl.notBefore).toLocaleDateString() : "—"],
                        ["Valid To", result.ssl?.notAfter ? new Date(result.ssl.notAfter).toLocaleDateString() : "—"],
                        ["Serial Number", result.ssl?.serialNumber ? `${result.ssl.serialNumber.slice(0, 20)}...` : "—"],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between gap-4 text-sm border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                          <span className="text-white/30 shrink-0">{label}</span>
                          <span className="text-white/80 font-mono text-right text-xs">{val}</span>
                        </div>
                      ))}
                      {result.ssl?.isExpired && (
                        <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">SSL Certificate Expired</p>
                            <p className="text-[10px] text-red-400/80 mt-0.5">The server's certificate is expired or invalid. Encrypted connections are not trusted.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* DNS Records */}
                <div className="glass rounded-[24px] p-6 border border-white/5">
                  <div className="flex items-center gap-2 mb-5">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">DNS Records (Cloudflare DoH)</h3>
                  </div>
                  {!result.dns || Object.keys(result.dns).length === 0 || Object.values(result.dns).every(arr => !arr || arr.length === 0) ? (
                    <p className="text-white/30 text-sm italic">No DNS records resolved or IP target scan skipped</p>
                  ) : (
                    <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                      {Object.entries(result.dns).map(([type, records]) => {
                        if (!records || records.length === 0) return null;
                        return (
                          <div key={type} className="space-y-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase">
                              {type} Records
                            </span>
                            <div className="space-y-1 mt-1 font-mono text-xs">
                              {records.map((r: any, idx: number) => (
                                <div key={idx} className="flex justify-between gap-4 p-2 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                                  <span className="text-white/40 break-all">TTL: {r.TTL}</span>
                                  <span className="text-white/80 break-all text-right select-all">{r.data}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Subdomain Discovery */}
                <div className="glass rounded-[24px] p-6 border border-white/5">
                  <div className="flex items-center gap-2 mb-5">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">Active Subdomains</h3>
                  </div>
                  {!result.subdomains || result.subdomains.length === 0 ? (
                    <p className="text-white/30 text-sm italic">No active subdomains discovered (scanned top 11 services)</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                      {result.subdomains.map((sub, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs font-mono">
                          <span className="text-white/70 truncate">{sub.subdomain}</span>
                          <span className="text-cyan-400 text-[10px] shrink-0">{sub.ip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Redirect Chain */}
                <div className="glass rounded-[24px] p-6 border border-white/5 col-span-1 lg:col-span-2">
                  <div className="flex items-center gap-2 mb-5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">HTTP Redirect Chain</h3>
                  </div>
                  {result.redirects?.error ? (
                    <p className="text-white/30 text-sm italic">{result.redirects?.error}</p>
                  ) : !result.redirects?.chain || result.redirects.chain.length === 0 ? (
                    <p className="text-white/30 text-sm italic">No redirects detected or check skipped</p>
                  ) : (
                    <div className="relative border-l border-white/10 pl-5 ml-2.5 space-y-6">
                      {result.redirects.chain.map((hop, i) => (
                        <div key={i} className="relative">
                          {/* Bullet */}
                          <div className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 ${
                            i === result.redirects!.chain!.length - 1 
                              ? "bg-green-400 border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" 
                              : "bg-[#020617] border-cyan-500"
                          }`} />
                          
                          <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="font-mono text-xs text-white font-bold select-all break-all">{hop.url}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                hop.status >= 300 && hop.status < 400 
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                  : "bg-green-500/10 text-green-400 border border-green-500/20"
                              }`}>
                                {hop.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-white/40 mt-1 font-mono">
                              Server: <span className="text-cyan-400/80">{hop.server}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Open Ports */}
              <div className="glass rounded-[24px] p-6 border border-white/5">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">
                      Open Ports ({result.openPorts.length})
                    </h3>
                  </div>
                  {result.openPorts.length > 6 && (
                    <button onClick={() => setShowAllPorts(!showAllPorts)} className="text-xs text-white/30 hover:text-cyan-400 flex items-center gap-1 transition-colors">
                      {showAllPorts ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all</>}
                    </button>
                  )}
                </div>

                {result.openPorts.length === 0 ? (
                  <div className="flex items-center gap-3 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>No open ports detected on common services</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(showAllPorts ? result.openPorts : result.openPorts.slice(0, 6)).map(p => {
                      const isDangerous = PORT_DANGER[p.port];
                      return (
                        <div key={p.port} className={`rounded-xl p-3 border flex items-start gap-3 ${isDangerous ? "bg-red-950/10 border-red-500/20" : "bg-white/[0.02] border-white/5"}`}>
                          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${isDangerous ? "bg-red-500" : "bg-green-500"}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-white">{p.port}</span>
                              <span className={`text-xs font-bold ${isDangerous ? "text-red-400" : "text-cyan-400"}`}>{p.service}</span>
                            </div>
                            {isDangerous && <p className="text-[10px] text-red-400/70 mt-0.5">{isDangerous}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scan metadata */}
              <div className="text-center text-xs text-white/15 font-mono pt-2">
                Scan completed {new Date(result.scannedAt).toLocaleString()} · {result.scanTime}s · {result.totalPortsScanned} ports probed
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!result && !isLoading && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-[32px] p-16 border border-white/5 flex flex-col items-center text-center gap-6">
            <div className="w-24 h-24 rounded-full bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center">
              <Wifi className="w-10 h-10 text-cyan-400/30" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white/40 uppercase tracking-widest mb-2">Awaiting Target</h2>
              <p className="text-white/20 text-sm max-w-md">Enter any domain or IP address above to run a full network threat intelligence scan.</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center mt-4">
              {[
                { icon: "🔌", label: "22 Port Scan", desc: "Common TCP ports" },
                { icon: "🌍", label: "GeoIP Lookup", desc: "ip-api.com (free)" },
                { icon: "☣️", label: "Botnet C2 Check", desc: "Feodo + ThreatFox" },
              ].map(f => (
                <div key={f.label} className="space-y-1">
                  <div className="text-2xl">{f.icon}</div>
                  <p className="text-xs font-bold text-white/40">{f.label}</p>
                  <p className="text-[10px] text-white/20">{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </main>
  );
}
