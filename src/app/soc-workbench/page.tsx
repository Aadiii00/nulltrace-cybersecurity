"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, Search, Terminal, AlertTriangle, CheckCircle, XCircle,
  FileText, Activity, Layers, Cpu, Server, MapPin, Database, ArrowRight,
  Download, Copy, Check, Filter, ChevronDown, ChevronUp, Clock, User,
  Plus, Eye, Lock, Mail, Globe, Hash, Shield, CornerDownRight, Play, RefreshCw, Zap
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Types
interface MITREMapping {
  tactic: string;
  technique: string;
  id: string;
  description: string;
  detection: string;
  mitigation: string;
}

interface CorrelationNode {
  id: string;
  label: string;
  type: string;
  group: string;
}

interface CorrelationLink {
  source: string;
  target: string;
  label: string;
}

interface TimelineEvent {
  time: string;
  event: string;
  type: string;
}

interface InvestigationResult {
  ioc: string;
  type: string;
  riskScore: number;
  severity: string;
  confidence: number;
  resolvedIp?: string;
  hosting?: string;
  virusTotal?: {
    reputation?: number;
    malicious?: number;
    suspicious?: number;
    clean?: number;
    totalVendors?: number;
    categories?: string[];
  };
  ssl?: {
    issuer?: string;
    validTo?: string;
    isExpired?: boolean;
    daysRemaining?: number;
  };
  dns?: {
    aRecords?: string[];
    mxRecords?: string[];
    nsRecords?: string[];
  };
  whois?: {
    registrar?: string;
    createdDate?: string;
    isNewlyRegistered?: boolean;
  };
  firstSeen: string;
  lastSeen: string;
  source: string;
  tags: string[];
  description: string;
  mitreMappings: MITREMapping[];
  correlation: {
    nodes: CorrelationNode[];
    links: CorrelationLink[];
  };
  timeline: TimelineEvent[];
}

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  ioc: string;
  status: "Open" | "In Progress" | "Closed";
  severity: "Critical" | "High" | "Medium" | "Low";
  owner: string;
  createdDate: string;
  evidence: string[];
  notes: string;
}

export default function SOCWorkbenchPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "investigate" | "mitre" | "cases" | "analyzer" | "ai" | "reports">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Case Management State
  const [cases, setCases] = useState<CaseItem[]>([
    {
      id: "CASE-9021",
      caseNumber: "CASE-9021",
      title: "Suspicious PowerShell C2 Beaconing",
      ioc: "104.21.81.193",
      status: "In Progress",
      severity: "High",
      owner: "Lead Analyst (Aditya)",
      createdDate: "2026-08-06 21:00 UTC",
      evidence: ["syslog_auth.log", "email_headers_phish.txt"],
      notes: "Isolated host workstation PC-042. Rotated API tokens."
    },
    {
      id: "CASE-9018",
      caseNumber: "CASE-9018",
      title: "Brute Force Authentication Storm",
      ioc: "198.51.100.42",
      status: "Open",
      severity: "Critical",
      owner: "Tier-2 SOC",
      createdDate: "2026-08-06 18:30 UTC",
      evidence: ["nginx_access.log"],
      notes: "Multiple 401/403 responses detected from IP range."
    }
  ]);

  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [copied, setCopied] = useState(false);

  // Log & Email Analyzer State
  const [logText, setLogText] = useState("");
  const [logAnalysis, setLogAnalysis] = useState<any>(null);
  const [emailText, setEmailText] = useState("");
  const [emailAnalysis, setEmailAnalysis] = useState<any>(null);
  const [analyzerMode, setAnalyzerMode] = useState<"log" | "email">("log");

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiChat, setAiChat] = useState<Array<{ sender: "user" | "ai"; message: string }>>([
    {
      sender: "ai",
      message: "Hello Analyst. I am the NullTrace AI SOC Assistant. Submit any indicator, incident log snippet, or request containment/eradication guidance."
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Auto-load malware investigation case from sessionStorage
  useEffect(() => {
    try {
      const storedCaseStr = sessionStorage.getItem("nulltrace_soc_create_case");
      if (storedCaseStr) {
        sessionStorage.removeItem("nulltrace_soc_create_case");
        const parsed = JSON.parse(storedCaseStr);
        const newCase: CaseItem = {
          id: `CASE-${Math.floor(1000 + Math.random() * 9000)}`,
          caseNumber: `CASE-${Math.floor(1000 + Math.random() * 9000)}`,
          title: parsed.title || "Malware Investigation",
          ioc: parsed.ioc || "SHA256 Hash",
          status: "Open",
          severity: parsed.severity || "High",
          owner: "Tier-1 SOC Analyst",
          createdDate: new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC",
          evidence: parsed.evidence || [],
          notes: parsed.notes || ""
        };
        setCases(prev => [newCase, ...prev]);
        setActiveTab("cases");
        if (parsed.ioc) {
          setSearchQuery(parsed.ioc);
        }
      }
    } catch (e) {
      console.error("Failed to parse SOC case from malware analysis:", e);
    }
  }, []);

  // Run Investigation
  const handleInvestigate = async (queryToRun?: string) => {
    const q = (queryToRun || searchQuery).trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/soc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "investigate", query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Investigation failed");
      setResult(data);
      setActiveTab("investigate");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Run Log Analysis
  const handleAnalyzeLog = async () => {
    if (!logText.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/soc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze-log", log_content: logText }),
      });
      const data = await res.json();
      setLogAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Run Email Header Analysis
  const handleAnalyzeEmail = async () => {
    if (!emailText.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/soc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze-email", headers: emailText }),
      });
      const data = await res.json();
      setEmailAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // AI SOC Chat
  const handleAiSend = async () => {
    if (!aiPrompt.trim()) return;
    const userMsg = aiPrompt;
    setAiChat(prev => [...prev, { sender: "user", message: userMsg }]);
    setAiPrompt("");
    setIsAiLoading(true);

    try {
      const res = await fetch("/api/soc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ai-assistant",
          prompt: userMsg,
          ioc: result?.ioc,
          context: result ? { risk: result.riskScore, type: result.type, mitre: result.mitreMappings } : undefined
        }),
      });
      const data = await res.json();
      setAiChat(prev => [...prev, { sender: "ai", message: data.response || "No response generated." }]);
    } catch (err: any) {
      setAiChat(prev => [...prev, { sender: "ai", message: `Error: ${err.message}` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Create Case
  const handleCreateCase = () => {
    if (!newCaseTitle.trim()) return;
    const newId = `CASE-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCase: CaseItem = {
      id: newId,
      caseNumber: newId,
      title: newCaseTitle,
      ioc: result?.ioc || "Global Investigation",
      status: "Open",
      severity: result?.severity as any || "Medium",
      owner: "Aditya (SOC Analyst)",
      createdDate: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
      evidence: result ? [result.ioc] : [],
      notes: "Incident investigation case initialized."
    };
    setCases([newCase, ...cases]);
    setNewCaseTitle("");
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white selection:bg-cyan-500/30">
      <Navbar />

      <div className="pt-28 pb-16 px-4 md:px-8 max-w-[1600px] mx-auto space-y-6">
        
        {/* Header Title Bar */}
        <div className="glass rounded-3xl p-6 border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-slate-900/40 to-blue-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-white tracking-wider uppercase">AI SOC Investigation Workbench</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono uppercase font-bold">
                  DEFENSIVE SIEM/SOAR
                </span>
              </div>
              <p className="text-xs text-white/50 font-sans mt-0.5">
                Incident Response, Evidence Correlation, MITRE ATT&CK Mapping & Threat Intelligence Operations
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-auto flex items-center gap-2">
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-white/40" />
              <input
                type="text"
                placeholder="Search IOC (IP, Hash, Domain, CVE)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvestigate()}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              onClick={() => handleInvestigate()}
              disabled={isLoading}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Investigate</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-white/5 text-xs font-mono">
          {[
            { id: "dashboard", label: "SOC Dashboard", icon: <Layers className="w-3.5 h-3.5" /> },
            { id: "investigate", label: "IOC Investigation", icon: <Search className="w-3.5 h-3.5" /> },
            { id: "mitre", label: "MITRE ATT&CK", icon: <Activity className="w-3.5 h-3.5" /> },
            { id: "cases", label: "Case Management", icon: <FileText className="w-3.5 h-3.5" /> },
            { id: "analyzer", label: "Log & Email Analyzer", icon: <Terminal className="w-3.5 h-3.5" /> },
            { id: "ai", label: "AI SOC Analyst", icon: <Cpu className="w-3.5 h-3.5 text-cyan-400" /> },
            { id: "reports", label: "Report Generator", icon: <Download className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-t-xl flex items-center gap-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-cyan-950/40 text-cyan-300 border-t border-x border-cyan-500/30 font-bold"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.02]"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: SOC DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Investigations", val: "1,248", icon: <Activity className="w-4 h-4 text-cyan-400" /> },
                { label: "Open SOC Cases", val: cases.filter(c => c.status !== "Closed").length, icon: <ShieldAlert className="w-4 h-4 text-yellow-400" /> },
                { label: "Critical Severity", val: "4 Cases", icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
                { label: "Threat Feeds Synced", val: "12 Live", icon: <Server className="w-4 h-4 text-green-400" /> },
              ].map((card, i) => (
                <div key={i} className="glass rounded-2xl p-5 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-white/40 text-xs uppercase font-mono">
                    <span>{card.label}</span>
                    {card.icon}
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">{card.val}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Cases */}
              <div className="lg:col-span-2 glass rounded-2xl p-6 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase font-mono tracking-widest text-white/70">Active SOC Incident Cases</h3>
                  <button onClick={() => setActiveTab("cases")} className="text-xs text-cyan-400 hover:underline font-mono">View All</button>
                </div>

                <div className="space-y-3">
                  {cases.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-400">{c.caseNumber}</span>
                          <span className="text-sm font-bold text-white">{c.title}</span>
                        </div>
                        <p className="text-xs text-white/40 font-mono">Target IOC: {c.ioc} · Owner: {c.owner}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          c.severity === "Critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-orange-500/20 text-orange-400"
                        }`}>
                          {c.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-white/60 text-[10px] font-mono">
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Threat Feed Summary */}
              <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
                <h3 className="font-bold text-xs uppercase font-mono tracking-widest text-white/70">Live Threat Feed Activity</h3>
                <div className="space-y-3 font-mono text-xs">
                  {[
                    { source: "AbuseIPDB", desc: "High confidence C2 address 198.51.100.42 flagged", time: "2m ago" },
                    { source: "VirusTotal", desc: "New hash match associated with LockBit 3.0", time: "14m ago" },
                    { source: "MITRE ATT&CK", desc: "T1059 Command execution technique spike detected", time: "1h ago" },
                    { source: "Shodan", desc: "Exposed RDP port 3389 identified on perimeter subnet", time: "3h ago" },
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.01] border border-white/5 space-y-1">
                      <div className="flex justify-between text-white/50 text-[10px]">
                        <span className="text-cyan-400 font-bold">{item.source}</span>
                        <span>{item.time}</span>
                      </div>
                      <p className="text-white/80">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IOC INVESTIGATION & CORRELATION */}
        {activeTab === "investigate" && (
          <div className="space-y-6">
            {!result ? (
              <div className="glass rounded-3xl p-12 border border-white/5 text-center space-y-4">
                <Search className="w-10 h-10 text-cyan-400/40 mx-auto" />
                <h3 className="text-lg font-bold uppercase font-mono text-white/60">No Active Investigation Loaded</h3>
                <p className="text-xs text-white/40 max-w-md mx-auto">
                  Enter any IP, Domain, Hash (SHA256), Email, or CVE ID in the search bar above to trigger the automated SOC risk & correlation engine.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  {["104.21.81.193", "e3b0c44298fc1c149afbf4c8996fb924", "admin@phish-target.com", "CVE-2026-1180"].map((sample) => (
                    <button
                      key={sample}
                      onClick={() => { setSearchQuery(sample); handleInvestigate(sample); }}
                      className="px-3 py-1 rounded-lg bg-white/5 hover:bg-cyan-950/30 border border-white/10 text-xs font-mono text-cyan-300 transition-colors"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Risk Score & IOC Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Score Card */}
                  <div className="glass rounded-2xl p-6 border border-cyan-500/30 bg-cyan-950/10 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-xs font-mono text-white/50 uppercase">
                        <span>Risk Score & Severity</span>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">{result.type}</span>
                      </div>
                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-5xl font-extrabold font-mono text-cyan-400">{result.riskScore}</span>
                        <span className="text-white/40 text-sm font-mono">/ 100</span>
                      </div>
                      <p className="mt-2 text-xs font-bold font-mono text-orange-400 uppercase tracking-widest">{result.severity} Risk Indicator</p>
                    </div>

                    <div className="pt-4 border-t border-white/5 text-xs text-white/40 font-mono flex justify-between">
                      <span>Confidence Level:</span>
                      <span className="text-white font-bold">{result.confidence}% Verified</span>
                    </div>
                  </div>

                  {/* Metadata Card */}
                  <div className="md:col-span-2 glass rounded-2xl p-6 border border-white/5 space-y-3">
                    <h3 className="font-bold text-xs uppercase font-mono tracking-widest text-white/60">IOC Details & Threat Summary</h3>
                    <p className="text-xs text-white/80 leading-relaxed font-sans">{result.description}</p>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-2 border-t border-white/5">
                      <div><span className="text-white/40">First Seen:</span> <p className="text-white font-bold">{result.firstSeen}</p></div>
                      <div><span className="text-white/40">Last Seen:</span> <p className="text-white font-bold">{result.lastSeen}</p></div>
                      <div><span className="text-white/40">Provider Source:</span> <p className="text-cyan-400 font-bold">{result.source}</p></div>
                      <div>
                        <span className="text-white/40">Tags:</span>
                        <div className="flex gap-1 mt-1">
                          {result.tags.map(t => (
                            <span key={t} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/70">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Telemetry Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* VirusTotal Vendor Intelligence Card */}
                  <div className="glass rounded-2xl p-4 border border-cyan-500/20 bg-cyan-950/10 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-white/60 font-bold uppercase flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" /> VirusTotal 70+ AV
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (result.virusTotal?.malicious || 0) > 0 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {result.virusTotal?.malicious || 0} / {result.virusTotal?.totalVendors || 70} Malicious
                      </span>
                    </div>
                    <div className="text-xs font-mono space-y-1 pt-1">
                      <div className="flex justify-between text-white/50">
                        <span>Reputation Score:</span>
                        <span className="text-white font-bold">{result.virusTotal?.reputation ?? 0}</span>
                      </div>
                      <div className="flex justify-between text-white/50">
                        <span>Clean Engine Count:</span>
                        <span className="text-emerald-400 font-bold">{result.virusTotal?.clean || 0} Vendors</span>
                      </div>
                    </div>
                  </div>

                  {/* Real Infrastructure & GeoIP Card */}
                  <div className="glass rounded-2xl p-4 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-white/60 font-bold uppercase flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-400" /> Host & Network
                      </span>
                      <span className="text-cyan-400 font-bold font-mono text-[10px]">{result.resolvedIp || "Direct IP"}</span>
                    </div>
                    <div className="text-xs font-mono space-y-1 pt-1">
                      <p className="text-white/80 font-bold truncate">{result.hosting || "Cloud/Enterprise Hosted"}</p>
                      <p className="text-[10px] text-white/40 font-mono">Real-time IP-API & Whois XML Telemetry</p>
                    </div>
                  </div>

                  {/* SSL / TLS Health Card */}
                  <div className="glass rounded-2xl p-4 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-white/60 font-bold uppercase flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-purple-400" /> SSL / TLS Health
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        result.ssl?.isExpired ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {result.ssl?.isExpired ? "Expired" : "Valid SSL"}
                      </span>
                    </div>
                    <div className="text-xs font-mono space-y-1 pt-1">
                      <div className="flex justify-between text-white/50">
                        <span>Issuer:</span>
                        <span className="text-white font-bold truncate max-w-[110px]">{result.ssl?.issuer || "Trusted CA"}</span>
                      </div>
                      <div className="flex justify-between text-white/50">
                        <span>Valid Days Left:</span>
                        <span className="text-purple-300 font-bold">{result.ssl?.daysRemaining ?? "Active"} Days</span>
                      </div>
                    </div>
                  </div>

                  {/* Live DNS Records Card */}
                  <div className="glass rounded-2xl p-4 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-white/60 font-bold uppercase flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-emerald-400" /> Live DNS Records
                      </span>
                      <span className="text-emerald-400 font-bold text-[10px]">A / MX / NS</span>
                    </div>
                    <div className="text-[11px] font-mono space-y-1 pt-1 text-white/70">
                      <p className="truncate"><span className="text-white/40">A:</span> {result.dns?.aRecords?.[0] || result.resolvedIp || "Configured"}</p>
                      <p className="truncate"><span className="text-white/40">MX:</span> {result.dns?.mxRecords?.[0] || "Standard Mail Gateway"}</p>
                    </div>
                  </div>
                </div>

                {/* Correlation Graph */}
                <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase font-mono text-white/70">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      IOC Node Correlation Graph
                    </div>
                    <span className="text-[10px] font-mono text-white/40">Interactive Infrastructure Map</span>
                  </div>

                  {/* SVG Node Graph */}
                  <div className="w-full h-64 bg-slate-950/60 rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center">
                    <svg className="w-full h-full">
                      {/* Lines */}
                      {result.correlation.links.map((link, idx) => (
                        <line
                          key={idx}
                          x1={120 + (idx * 160)}
                          y1={130}
                          x2={240 + (idx * 160)}
                          y2={130}
                          stroke="#06b6d4"
                          strokeWidth="1.5"
                          strokeDasharray="4"
                          opacity="0.6"
                        />
                      ))}
                      {/* Nodes */}
                      {result.correlation.nodes.map((node, idx) => (
                        <g key={node.id} transform={`translate(${120 + (idx * 160)}, 130)`}>
                          <circle r="24" fill="#0f172a" stroke={idx === 0 ? "#06b6d4" : "#3b82f6"} strokeWidth="2" />
                          <text y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            {node.type.slice(0, 4)}
                          </text>
                          <text y="40" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                            {node.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MITRE ATT&CK */}
        {activeTab === "mitre" && (
          <div className="space-y-6">
            {/* Quick Threat Presets */}
            <div className="glass rounded-2xl p-4 border border-cyan-500/20 bg-cyan-950/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">Interactive Threat Scenario Demos</h4>
                <p className="text-[11px] text-white/50 font-sans mt-0.5">Click any threat scenario to load verified MITRE ATT&CK tactics & mitigation strategies:</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { name: "💥 Ransomware Outbreak", query: "LockBit Ransomware Canary Encryptor" },
                  { name: "📧 Spearphishing Attack", query: "phishing-bank-login-secure.xyz" },
                  { name: "🐛 CVE Exploit", query: "CVE-2026-1180 Remote Execution" },
                  { name: "💾 Binary Malware", query: "e3b0c44298fc1c149afbf4c8996fb924" },
                  { name: "🌐 C2 Beaconing", query: "185.220.101.5 C2 Infrastructure" }
                ].map((demo) => (
                  <button
                    key={demo.name}
                    onClick={() => { setSearchQuery(demo.query); handleInvestigate(demo.query); }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-xs font-mono text-cyan-300 font-bold transition-all hover:border-cyan-400"
                  >
                    {demo.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs uppercase font-mono tracking-widest text-white/70">
                  MITRE ATT&CK Threat Mapping Matrix {result?.ioc ? `— Target: [${result.ioc}]` : ""}
                </h3>
                <span className="text-xs font-mono text-cyan-400">Enterprise Framework v14</span>
              </div>

              {result?.mitreMappings && result.mitreMappings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.mitreMappings.map((m, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-cyan-500/20 space-y-2 font-mono text-xs">
                      <div className="flex justify-between text-cyan-400 font-bold">
                        <span className="uppercase text-[11px] font-mono tracking-wider">{m.tactic}</span>
                        <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-bold">{m.id}</span>
                      </div>
                      <p className="text-white font-bold text-sm">{m.technique}</p>
                      <p className="text-white/60 font-sans leading-relaxed text-xs">{m.description}</p>
                      <div className="pt-2 border-t border-white/5 space-y-1 text-[11px]">
                        <p className="text-white/40"><span className="text-yellow-400 font-bold">Detection Strategy:</span> {m.detection}</p>
                        <p className="text-white/40"><span className="text-green-400 font-bold">Mitigation Strategy:</span> {m.mitigation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      tactic: "Impact",
                      technique: "Data Encrypted for Impact",
                      id: "T1486",
                      description: "Adversaries encrypt data on target systems to interrupt availability. Captured via Canary Shield.",
                      detection: "Monitor rapid file modification volume, canary decoy file access, and process behavior.",
                      mitigation: "Deploy Sentinel EDR Canary Shield and automated process termination."
                    },
                    {
                      tactic: "Execution",
                      technique: "Command and Scripting Interpreter",
                      id: "T1059.001",
                      description: "Adversaries execute malicious PowerShell scripts to initiate payload deployment.",
                      detection: "Audit Script Block Logging (Event ID 4104) and parent-child process execution trees.",
                      mitigation: "Enforce PowerShell Constrained Language Mode and AppLocker rules."
                    },
                    {
                      tactic: "Initial Access",
                      technique: "Spearphishing Link",
                      id: "T1566.002",
                      description: "Adversaries send targeted emails containing links to credential harvesting landing pages.",
                      detection: "Inspect email gateway logs, URL rewriting records, and newly registered domain proxy traffic.",
                      mitigation: "Deploy automated URL rewriting and DMARC/SPF authentication verification."
                    },
                    {
                      tactic: "Command and Control",
                      technique: "Application Layer Protocol: Web Protocols",
                      id: "T1071.001",
                      description: "Adversaries utilize HTTP/HTTPS protocols to communicate with C2 infrastructure.",
                      detection: "Inspect netflow logs, proxy SSL interception records, and high-frequency beaconing intervals.",
                      mitigation: "Enforce strict egress proxy filtering, SSL decryption, and automated IP/Domain sinkholing."
                    }
                  ].map((m, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-cyan-500/20 space-y-2 font-mono text-xs">
                      <div className="flex justify-between text-cyan-400 font-bold">
                        <span className="uppercase text-[11px] font-mono tracking-wider">{m.tactic}</span>
                        <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-bold">{m.id}</span>
                      </div>
                      <p className="text-white font-bold text-sm">{m.technique}</p>
                      <p className="text-white/60 font-sans leading-relaxed text-xs">{m.description}</p>
                      <div className="pt-2 border-t border-white/5 space-y-1 text-[11px]">
                        <p className="text-white/40"><span className="text-yellow-400 font-bold">Detection Strategy:</span> {m.detection}</p>
                        <p className="text-white/40"><span className="text-green-400 font-bold">Mitigation Strategy:</span> {m.mitigation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CASE MANAGEMENT */}
        {activeTab === "cases" && (
          <div className="space-y-6">
            {/* Create Case Controls */}
            <div className="glass rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
              <input
                type="text"
                placeholder="Enter new incident case title..."
                value={newCaseTitle}
                onChange={(e) => setNewCaseTitle(e.target.value)}
                className="w-full md:w-96 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleCreateCase}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Initialize Case</span>
              </button>
            </div>

            {/* Case List */}
            <div className="space-y-4">
              {cases.map((c) => (
                <div key={c.id} className="glass rounded-2xl p-6 border border-white/5 space-y-3 font-mono text-xs">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold">{c.caseNumber}</span>
                      <h4 className="text-sm font-bold text-white">{c.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.severity === "Critical" ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"
                      }`}>{c.severity}</span>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white/80">{c.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white/50 text-[11px]">
                    <div><span>Owner:</span> <p className="text-white font-bold">{c.owner}</p></div>
                    <div><span>Created:</span> <p className="text-white font-bold">{c.createdDate}</p></div>
                    <div><span>Primary IOC:</span> <p className="text-cyan-400 font-bold">{c.ioc}</p></div>
                    <div>
                      <span>Evidence Files:</span>
                      <p className="text-white font-bold">{c.evidence.length} file(s) attached</p>
                    </div>
                  </div>

                  <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 text-white/70">
                    <span className="text-white/40 font-bold">Investigative Notes:</span> {c.notes}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: LOG & EMAIL ANALYZER */}
        {activeTab === "analyzer" && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <button
                onClick={() => setAnalyzerMode("log")}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  analyzerMode === "log" ? "bg-cyan-500 text-slate-950" : "bg-white/5 text-white/50"
                }`}
              >
                Log File Analyzer (EVTX/Syslog/Apache)
              </button>
              <button
                onClick={() => setAnalyzerMode("email")}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  analyzerMode === "email" ? "bg-cyan-500 text-slate-950" : "bg-white/5 text-white/50"
                }`}
              >
                RFC 822 Email Header Inspector
              </button>
            </div>

            {analyzerMode === "log" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass rounded-2xl p-6 border border-white/5 space-y-3">
                  <h3 className="font-bold text-xs uppercase font-mono tracking-widest text-white/70">Paste Log Output</h3>
                  <textarea
                    rows={10}
                    placeholder="Paste log output lines here (e.g. Failed password for root from 192.168.1.50...)"
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-green-400 placeholder-white/20 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={handleAnalyzeLog}
                    disabled={isLoading}
                    className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl font-mono flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Automated Log Threat Detection</span>
                  </button>
                </div>

                <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
                  <h3 className="font-bold text-xs uppercase font-mono tracking-widest text-white/70">Log Threat Findings</h3>
                  {logAnalysis ? (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between text-white/50 pb-2 border-b border-white/5">
                        <span>Lines Scanned: {logAnalysis.totalLinesScanned}</span>
                        <span className="text-orange-400 font-bold">Threat Level: {logAnalysis.riskLevel}</span>
                      </div>
                      {logAnalysis.findings.map((f: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-red-500/20 space-y-1">
                          <div className="flex justify-between text-red-400 font-bold">
                            <span>{f.category}</span>
                            <span>{f.mitreId}</span>
                          </div>
                          <p className="text-white/80">{f.description}</p>
                          <p className="text-cyan-300 text-[11px] pt-1">Fix: {f.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 font-mono italic">Awaiting log content analysis...</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass rounded-2xl p-6 border border-white/5 space-y-3">
                  <h3 className="font-bold text-xs uppercase font-mono tracking-widest text-white/70">Paste Email Headers</h3>
                  <textarea
                    rows={10}
                    placeholder="Paste raw email headers here (Received: from mail.example.com... Authentication-Results: spf=pass...)"
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-cyan-300 placeholder-white/20 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={handleAnalyzeEmail}
                    disabled={isLoading}
                    className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl font-mono flex items-center justify-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Evaluate Email Trust & Spoofing Score</span>
                  </button>
                </div>

                <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
                  <h3 className="font-bold text-xs uppercase font-mono tracking-widest text-white/70">Email Header Authentication Results</h3>
                  {emailAnalysis ? (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex justify-between items-center">
                        <div>
                          <p className="text-white/50 text-[10px]">Trust Rating Verdict</p>
                          <p className="text-sm font-bold text-cyan-300">{emailAnalysis.verdict}</p>
                        </div>
                        <span className="text-3xl font-extrabold text-cyan-400">{emailAnalysis.trustScore}%</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded bg-white/5 border border-white/5">
                          <p className="text-white/40 text-[10px]">SPF</p>
                          <p className="font-bold text-green-400">{emailAnalysis.authentication.spf}</p>
                        </div>
                        <div className="p-2 rounded bg-white/5 border border-white/5">
                          <p className="text-white/40 text-[10px]">DKIM</p>
                          <p className="font-bold text-green-400">{emailAnalysis.authentication.dkim}</p>
                        </div>
                        <div className="p-2 rounded bg-white/5 border border-white/5">
                          <p className="text-white/40 text-[10px]">DMARC</p>
                          <p className="font-bold text-green-400">{emailAnalysis.authentication.dmarc}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-white/40 text-[11px] mb-1">Originating / Relay Hops IP Addresses:</p>
                        <div className="flex flex-wrap gap-1">
                          {emailAnalysis.originatingIPs.map((ip: string) => (
                            <span key={ip} className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">{ip}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 font-mono italic">Awaiting email header evaluation...</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: AI SOC ANALYST */}
        {activeTab === "ai" && (
          <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase font-mono text-cyan-400 border-b border-white/5 pb-3">
              <Cpu className="w-4 h-4" />
              <span>NullTrace Copilot — Incident Containment & Remediation Assistant</span>
            </div>

            <div className="h-80 overflow-y-auto space-y-3 p-4 bg-slate-950/60 rounded-xl border border-white/5 font-mono text-xs">
              {aiChat.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl max-w-2xl ${
                    msg.sender === "user"
                      ? "bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 ml-auto"
                      : "bg-white/[0.02] border border-white/5 text-white/90"
                  }`}
                >
                  <p className="text-[10px] text-white/40 mb-1">{msg.sender === "user" ? "You (Analyst)" : "AI SOC Copilot"}</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
              ))}
              {isAiLoading && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 italic animate-pulse">
                  Analyzing incident context & generating mitigation guidance...
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask AI SOC Assistant (e.g. How to contain suspicious PowerShell execution?)..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiSend()}
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleAiSend}
                disabled={isAiLoading}
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl font-mono shrink-0"
              >
                Send Query
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: REPORT GENERATOR */}
        {activeTab === "reports" && (
          <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
            <h3 className="font-bold text-xs uppercase font-mono tracking-widest text-white/70">SOC Incident Report Generator</h3>
            <p className="text-xs text-white/50 font-sans">
              Export comprehensive incident documentation including timeline, MITRE mappings, risk scores, and evidence logs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {[
                { title: "Executive Briefing Report", format: "PDF Format", desc: "High-level summary of business impact, risk score, and containment actions." },
                { title: "Technical Incident Dossier", format: "JSON Format", desc: "Raw technical indicators, correlation nodes, log lines, and hashes." },
                { title: "SOC Evidence Export", format: "CSV Format", desc: "Structured tabular export of all IOCs and MITRE ATT&CK techniques." },
              ].map((rep, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-3 font-mono text-xs">
                  <div>
                    <h4 className="font-bold text-white text-sm">{rep.title}</h4>
                    <span className="text-cyan-400 text-[10px]">{rep.format}</span>
                    <p className="text-white/40 text-xs font-sans mt-2">{rep.desc}</p>
                  </div>
                  <button
                    onClick={() => handleCopyText(JSON.stringify(result || cases, null, 2))}
                    className="py-2 px-3 bg-white/5 hover:bg-cyan-950/30 border border-white/10 rounded-xl text-white hover:text-cyan-300 font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{copied ? "Report Copied" : "Export Report"}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <Footer />
    </main>
  );
}
