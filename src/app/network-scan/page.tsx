"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Shield, ShieldAlert, ShieldCheck, Search, AlertTriangle,
  Server, Wifi, MapPin, Activity, Clock, ArrowLeft, RefreshCw,
  CheckCircle, XCircle, Terminal, ChevronDown, ChevronUp, Copy, Check,
  Calendar, Lock, Cpu, CpuIcon, Award, FileText, CheckSquare, Layers
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface PortResult {
  port: number;
  state: string;
  service: string;
  riskLevel?: string;
  purpose?: string;
  securityRisks?: string;
  recommendation?: string;
  banner?: string | null;
}

interface GeoIP {
  country?: string; countryCode?: string; regionName?: string; city?: string;
  lat?: number; lon?: number; isp?: string; org?: string; as?: string;
  proxy?: boolean; hosting?: boolean; mobile?: boolean; hostname?: string; error?: string;
}

interface VirusTotalVendor {
  vendor: string;
  category: string;
  result: string;
  method?: string;
}

interface VirusTotalData {
  reputation?: number;
  malicious?: number;
  suspicious?: number;
  clean?: number;
  totalVendors?: number;
  lastAnalysisDate?: string;
  vendors?: VirusTotalVendor[];
  categories?: string[];
  error?: string;
}

interface ShodanService {
  port: number;
  service: string;
  banner: string;
  product?: string;
  version?: string;
}

interface ShodanData {
  os?: string;
  org?: string;
  asn?: number;
  hostnames?: string[];
  shodanTags?: string[];
  vulns?: string[];
  ports?: number[];
  lastUpdate?: string;
  services?: ShodanService[];
  error?: string;
}

interface WhoisDetails {
  registrar?: string;
  registrantCountry?: string;
  created?: string;
  expires?: string;
  changed?: string;
  domainStatus?: string[];
  nameServers?: string[];
  dnssecStatus?: string;
  abuseContact?: string;
  whoisServer?: string;
  ageDays?: number | null;
  isNewlyRegistered?: boolean;
  isExpiringSoon?: boolean;
  provider?: string;
  error?: string;
  note?: string;
}

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
  tlsVersion?: string;
  cipherSuite?: string;
  sslGrade?: string;
  forwardSecrecy?: boolean;
  error?: string;
  note?: string;
}

interface DNSEnhanced {
  records?: Record<string, any[]>;
  spf?: string | null;
  dmarc?: string | null;
  ptr?: string | null;
  emailSecurityWarnings?: string[];
  note?: string;
}

interface DetectedTech {
  name: string;
  type: string;
  icon: string;
}

interface HTTPSecurity {
  securityHeadersScore?: number;
  headerCompliance?: Record<string, boolean>;
  detectedTechnologies?: DetectedTech[];
}

interface ThreatSource {
  name: string;
  isClean: boolean;
  badge: string;
  details: string;
}

interface ThreatIntelAggregator {
  overallStatus?: string;
  threatCount?: number;
  sources?: ThreatSource[];
}

interface AISecurityInsights {
  summary?: string;
  contributingFindings?: string[];
  potentialAttackVectors?: string[];
  recommendedActions?: string[];
  remediationPriority?: string;
}

interface Risk { score: number; level: string; color: string; factors: string[]; }

interface ScanResult {
  target: string;
  resolvedIp: string;
  scanTime: number;
  scannedAt: string;
  openPorts: PortResult[];
  totalPortsScanned: number;
  geoip: GeoIP;
  asn: { asn?: any; holder?: string };
  whois?: WhoisDetails;
  virusTotal?: VirusTotalData;
  shodan?: ShodanData;
  dns?: DNSEnhanced;
  ssl?: SSLDetails;
  httpSecurity?: HTTPSecurity;
  threatIntel?: ThreatIntelAggregator;
  aiInsights?: AISecurityInsights;
  risk: Risk;
}

const RISK_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  Critical: { bg: "bg-red-950/20", border: "border-red-500/30", text: "text-red-400", glow: "shadow-[0_0_60px_rgba(239,68,68,0.15)]" },
  High:     { bg: "bg-orange-950/20", border: "border-orange-500/30", text: "text-orange-400", glow: "shadow-[0_0_60px_rgba(249,115,22,0.15)]" },
  Medium:   { bg: "bg-yellow-950/20", border: "border-yellow-500/30", text: "text-yellow-400", glow: "shadow-[0_0_60px_rgba(234,179,8,0.15)]" },
  Low:      { bg: "bg-cyan-950/10", border: "border-cyan-500/20", text: "text-cyan-400", glow: "shadow-[0_0_60px_rgba(34,211,238,0.15)]" },
};

export default function NetworkScanPage() {
  const [target, setTarget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllPorts, setShowAllPorts] = useState(false);
  const [showAllVendors, setShowAllVendors] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
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
              <p className="text-white/40 text-sm mt-1">VirusTotal · Shodan · WHOIS · DNS & SSL Forensic Scanner</p>
            </div>
          </div>
          <p className="text-white/50 max-w-2xl leading-relaxed">
            Multi-layered threat intelligence suite — query <span className="text-cyan-400">VirusTotal</span>, <span className="text-cyan-400">Shodan</span>, <span className="text-cyan-400">WhoisXML</span>, HTTP Security Headers, and AI Security Insights.
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
                placeholder="Enter domain or IP  (e.g. google.com, 8.8.8.8)"
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

          <div className="flex flex-wrap gap-2 mt-4">
            {["google.com", "cloudflare.com", "8.8.8.8", "1.1.1.1"].map(ex => (
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
                <p className="font-bold text-white text-lg">Running Enhanced Cyber Sentinel Scan</p>
                <p className="text-white/40 text-sm mt-2">Querying VirusTotal · Shodan · WhoisXML · Security Headers...</p>
                <p className="text-white/20 text-xs mt-4 font-mono">Synthesizing intelligence engines...</p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {[
                  "Resolving target IP address",
                  "Querying VirusTotal reputation v3",
                  "Scanning Shodan host exposure & banners",
                  "Fetching WHOIS & domain age intelligence",
                  "Probing common TCP ports & service banners",
                  "Analyzing HTTP security headers & framework tech",
                  "Calculating email security records (SPF/DMARC)",
                  "Evaluating SSL certificate & TLS cipher grade",
                  "Generating AI Security Insights"
                ].map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center gap-3 text-xs text-white/30"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
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
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-white/50 text-sm font-mono">{result.target} → {result.resolvedIp}</p>
                        <button onClick={() => handleCopy(result.resolvedIp, "ip")} className="text-white/30 hover:text-cyan-400 transition-colors">
                          {copiedText === "ip" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
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
                    <button onClick={() => handleCopy(JSON.stringify(result, null, 2), "json")} className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors">
                      {copiedText === "json" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedText === "json" ? "Copied JSON" : "Export JSON"}
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

              {/* Upgrade 11: AI Security Insights */}
              {result.aiInsights && (
                <div className="glass rounded-[24px] p-6 border border-cyan-500/20 bg-cyan-950/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm uppercase tracking-wider">
                      <Cpu className="w-4 h-4" />
                      AI Security Insights & Intelligence Executive Summary
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      result.aiInsights.remediationPriority === "HIGH" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"
                    }`}>
                      {result.aiInsights.remediationPriority} Priority
                    </span>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed font-sans">{result.aiInsights.summary}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Potential Attack Vectors</p>
                      <ul className="space-y-1.5 text-xs text-white/70">
                        {result.aiInsights.potentialAttackVectors?.map((v, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                            {v}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Recommended Actions</p>
                      <ul className="space-y-1.5 text-xs text-white/70">
                        {result.aiInsights.recommendedActions?.map((a, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Resolved IP", value: result.resolvedIp, icon: <Globe className="w-4 h-4" /> },
                  { label: "Open Ports", value: `${result.openPorts.length} / ${result.totalPortsScanned}`, icon: <Terminal className="w-4 h-4" /> },
                  { label: "VirusTotal Detections", value: `${result.virusTotal?.malicious || 0} / ${result.virusTotal?.totalVendors || 0}`, icon: <Shield className="w-4 h-4" /> },
                  { label: "SSL Grade", value: result.ssl?.sslGrade ? `Grade ${result.ssl.sslGrade}` : "N/A", icon: <Award className="w-4 h-4" /> },
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

                {/* Upgrade 1: Enhanced WHOIS Intelligence */}
                <div className="glass rounded-[24px] p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">WHOIS & Registration Intel</h3>
                    </div>
                    <button onClick={() => toggleSection("whois")} className="text-white/30 hover:text-cyan-400">
                      {collapsedSections.whois ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {!collapsedSections.whois && (
                    result.whois?.error ? (
                      <p className="text-white/30 text-sm italic">{result.whois.error}</p>
                    ) : (
                      <div className="space-y-3">
                        {[
                          ["Registrar", result.whois?.registrar || "—"],
                          ["Registrant Country", result.whois?.registrantCountry || "—"],
                          ["Domain Age", result.whois?.ageDays != null ? `${result.whois.ageDays} Days` : "—"],
                          ["Creation Date", result.whois?.created ? new Date(result.whois.created).toLocaleDateString() : "—"],
                          ["Expiration Date", result.whois?.expires ? new Date(result.whois.expires).toLocaleDateString() : "—"],
                          ["Last Updated", result.whois?.changed ? new Date(result.whois.changed).toLocaleDateString() : "—"],
                          ["DNSSEC Status", result.whois?.dnssecStatus || "Unsigned"],
                          ["Abuse Contact", result.whois?.abuseContact || "—"],
                          ["WHOIS Server", result.whois?.whoisServer || "—"],
                        ].map(([label, val]) => (
                          <div key={label} className="flex justify-between gap-4 text-sm border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                            <span className="text-white/30 shrink-0">{label}</span>
                            <span className="text-white/80 font-mono text-right text-xs break-all">{val}</span>
                          </div>
                        ))}
                        {result.whois?.isNewlyRegistered && (
                          <div className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Recently Registered Domain (&lt; 180 Days)</span>
                          </div>
                        )}
                        {result.whois?.isExpiringSoon && (
                          <div className="mt-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>Expiring Soon (&lt; 30 Days)</span>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>

                {/* Upgrade 13: IP Geolocation & Location Intel */}
                <div className="glass rounded-[24px] p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">IP Geolocation & Location Intel</h3>
                    </div>
                    <button onClick={() => toggleSection("geoip")} className="text-white/30 hover:text-cyan-400">
                      {collapsedSections.geoip ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {!collapsedSections.geoip && (
                    result.geoip?.error ? (
                      <p className="text-white/30 text-sm italic">{result.geoip.error}</p>
                    ) : (
                      <div className="space-y-3">
                        {[
                          ["Country", result.geoip?.country ? `${result.geoip.country} (${result.geoip.countryCode || ""})` : "—"],
                          ["City / Region", result.geoip?.city ? `${result.geoip.city}${result.geoip.regionName ? `, ${result.geoip.regionName}` : ""}` : (result.geoip?.regionName || "—")],
                          ["Latitude / Longitude", result.geoip?.lat != null ? `${result.geoip.lat}, ${result.geoip.lon}` : "—"],
                          ["ISP / Carrier", result.geoip?.isp || "—"],
                          ["Organization", result.geoip?.org || "—"],
                          ["Autonomous System (ASN)", result.geoip?.as || result.asn?.asn ? `AS${result.asn.asn || result.geoip.as}` : "—"],
                          ["Timezone", result.geoip?.timezone || "—"],
                          ["Host / Proxy Status", result.geoip?.hosting ? "Cloud / Hosting Provider" : result.geoip?.proxy ? "VPN / Proxy Detected" : "Standard Broadband"],
                        ].map(([label, val]) => (
                          <div key={label} className="flex justify-between gap-4 text-sm border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                            <span className="text-white/30 shrink-0">{label}</span>
                            <span className="text-white/80 font-mono text-right text-xs break-all">{val}</span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* Upgrade 2: VirusTotal Intelligence */}
                <div className="glass rounded-[24px] p-6 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">VirusTotal Reputation</h3>
                    </div>
                    <button onClick={() => toggleSection("vt")} className="text-white/30 hover:text-cyan-400">
                      {collapsedSections.vt ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>

                  {!collapsedSections.vt && (
                    result.virusTotal?.error ? (
                      <p className="text-white/30 text-sm italic">{result.virusTotal.error}</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-xl font-bold text-red-400">{result.virusTotal?.malicious || 0}</p>
                            <p className="text-[10px] text-red-400/80 font-bold uppercase">Malicious</p>
                          </div>
                          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-xl font-bold text-yellow-400">{result.virusTotal?.suspicious || 0}</p>
                            <p className="text-[10px] text-yellow-400/80 font-bold uppercase">Suspicious</p>
                          </div>
                          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                            <p className="text-xl font-bold text-green-400">{result.virusTotal?.clean || 0}</p>
                            <p className="text-[10px] text-green-400/80 font-bold uppercase">Clean</p>
                          </div>
                        </div>

                        {/* Vendors Table */}
                        {result.virusTotal?.vendors && result.virusTotal.vendors.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between text-xs text-white/40">
                              <span>Security Vendor Breakdown</span>
                              <button onClick={() => setShowAllVendors(!showAllVendors)} className="text-cyan-400 hover:underline text-[10px]">
                                {showAllVendors ? "Show Less" : "Expand All"}
                              </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-xs pr-1">
                              {(showAllVendors ? result.virusTotal.vendors : result.virusTotal.vendors.slice(0, 5)).map((v, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/5">
                                  <span className="text-white/70">{v.vendor}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    v.category === "malicious" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-green-500/20 text-green-400"
                                  }`}>
                                    {v.result}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )
                  )}
                </div>

                {/* Upgrade 7 & 4: SSL/TLS & Censys Intelligence */}
                <div className="glass rounded-[24px] p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">SSL/TLS & Certificate Grade</h3>
                    </div>
                    <button onClick={() => toggleSection("ssl")} className="text-white/30 hover:text-cyan-400">
                      {collapsedSections.ssl ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>

                  {!collapsedSections.ssl && (
                    result.ssl?.error || result.ssl?.note ? (
                      <p className="text-white/30 text-sm italic">{result.ssl?.error || result.ssl?.note}</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-xs text-white/50">SSL Grade Rating</span>
                          <span className={`text-2xl font-black px-3 py-1 rounded-lg ${
                            result.ssl?.sslGrade === "A" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}>
                            {result.ssl?.sslGrade}
                          </span>
                        </div>

                        {[
                          ["Common Name", result.ssl?.commonName || "—"],
                          ["Issuer", result.ssl?.issuerCommonName || "—"],
                          ["TLS Version", result.ssl?.tlsVersion || "—"],
                          ["Cipher Suite", result.ssl?.cipherSuite || "—"],
                          ["Forward Secrecy", result.ssl?.forwardSecrecy ? "Enabled (ECDHE)" : "Disabled"],
                          ["Days Remaining", `${result.ssl?.daysRemaining ?? 0} days`],
                        ].map(([label, val]) => (
                          <div key={label} className="flex justify-between gap-4 text-sm border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                            <span className="text-white/30 shrink-0">{label}</span>
                            <span className="text-white/80 font-mono text-right text-xs break-all">{val}</span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* Upgrade 8 & 9: HTTP Security & Technology Detection */}
                <div className="glass rounded-[24px] p-6 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">Security Headers & Tech Stack</h3>
                    </div>
                    <button onClick={() => toggleSection("http")} className="text-white/30 hover:text-cyan-400">
                      {collapsedSections.http ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>

                  {!collapsedSections.http && (
                    <div className="space-y-4">
                      {/* Headers Score */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-xs text-white/50">Security Headers Score</span>
                        <span className="text-xl font-bold text-cyan-400 font-mono">
                          {result.httpSecurity?.securityHeadersScore || 0}%
                        </span>
                      </div>

                      {/* Header Compliance List */}
                      {result.httpSecurity?.headerCompliance && (
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(result.httpSecurity.headerCompliance).map(([header, present]) => (
                            <div key={header} className="p-2 rounded bg-white/[0.01] border border-white/5 flex items-center justify-between text-[11px]">
                              <span className="text-white/60 truncate">{header}</span>
                              {present ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400/60" />}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Detected Tech */}
                      <div>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Detected Technologies</p>
                        {result.httpSecurity?.detectedTechnologies && result.httpSecurity.detectedTechnologies.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {result.httpSecurity.detectedTechnologies.map((tech, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs flex items-center gap-1.5">
                                <span>{tech.icon}</span>
                                <span>{tech.name}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-white/30 text-xs italic">No technology fingerprints exposed</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Upgrade 6: DNS & Email Security Improvements */}
                <div className="glass rounded-[24px] p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">DNS & Email Security</h3>
                    </div>
                    <button onClick={() => toggleSection("dns")} className="text-white/30 hover:text-cyan-400">
                      {collapsedSections.dns ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>

                  {!collapsedSections.dns && (
                    <div className="space-y-3">
                      {[
                        ["SPF Record", result.dns?.spf ? "✅ Configured" : "❌ Missing"],
                        ["DMARC Record", result.dns?.dmarc ? "✅ Configured" : "❌ Missing"],
                        ["PTR (Reverse DNS)", result.dns?.ptr || "—"],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between gap-4 text-sm border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                          <span className="text-white/30 shrink-0">{label}</span>
                          <span className="text-white/80 font-mono text-right text-xs">{val}</span>
                        </div>
                      ))}

                      {result.dns?.emailSecurityWarnings && result.dns.emailSecurityWarnings.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {result.dns.emailSecurityWarnings.map((w, i) => (
                            <div key={i} className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Upgrade 10: Multi-Source Threat Intelligence */}
                <div className="glass rounded-[24px] p-6 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">Multi-Source Threat Intelligence</h3>
                    </div>
                    <button onClick={() => toggleSection("threats")} className="text-white/30 hover:text-cyan-400">
                      {collapsedSections.threats ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>

                  {!collapsedSections.threats && result.threatIntel?.sources && (
                    <div className="space-y-2">
                      {result.threatIntel.sources.map((src, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-white/80">{src.name}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">{src.details}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            src.isClean ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}>
                            {src.badge}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Upgrade 3 & 12: Better Open Ports & Shodan Merged Intelligence */}
              <div className="glass rounded-[24px] p-6 border border-white/5">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold uppercase tracking-widest text-xs text-white/60">
                      Open Ports & Detailed Risk Breakdown ({result.openPorts.length})
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
                    <span>No exposed TCP services or open ports detected</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(showAllPorts ? result.openPorts : result.openPorts.slice(0, 6)).map(p => (
                      <div key={p.port} className="rounded-xl p-4 bg-white/[0.02] border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-white">{p.port}</span>
                            <span className="text-xs font-bold text-cyan-400">{p.service}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.riskLevel === "Critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                            p.riskLevel === "High" ? "bg-orange-500/20 text-orange-400" : "bg-cyan-500/20 text-cyan-300"
                          }`}>
                            {p.riskLevel || "Low"} Risk
                          </span>
                        </div>
                        {p.purpose && <p className="text-xs text-white/70"><span className="text-white/40">Purpose:</span> {p.purpose}</p>}
                        {p.securityRisks && <p className="text-xs text-red-400/80"><span className="text-red-400 font-bold">Risks:</span> {p.securityRisks}</p>}
                        {p.recommendation && <p className="text-[11px] text-cyan-300/80 bg-cyan-950/20 p-2 rounded border border-cyan-500/10"><span className="font-bold">Action:</span> {p.recommendation}</p>}
                      </div>
                    ))}
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
          </motion.div>
        )}
      </div>

      <Footer />
    </main>
  );
}
