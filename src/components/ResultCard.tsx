"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, CheckCircle2, AlertTriangle, HelpCircle, Info, Download, Copy, Check } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { ThreatAnalysis } from "@/types/threats";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ResultCard({ data }: { data: ThreatAnalysis }) {
  const [copied, setCopied] = useState(false);

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "low": return "text-green-400 border-green-400/30 bg-green-400/10 neon-border";
      case "medium": return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10 neon-border";
      case "high": return "text-orange-400 border-orange-400/30 bg-orange-400/10 neon-border";
      case "critical": return "text-red-400 border-red-400/30 bg-red-400/10 danger-pulse";
      default: return "text-primary border-primary/30 bg-primary/10 neon-border";
    }
  };

  const handleShare = async () => {
    const summary = `🛡️ NULLTRACE THREAT INTELLIGENCE REPORT
Risk Level: ${data.riskLevel.toUpperCase()}
Trust Score: ${data.trustScore}/100
Intent Classification: ${data.intent.toUpperCase()}
Emotional Tone: ${data.emotion}

Summary:
${data.analysis}

Flagged Elements:
${data.riskyParts && data.riskyParts.length > 0 ? data.riskyParts.join(", ") : "None"}
`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy report", e);
    }
  };

  const handleDownloadPdf = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const riskBadgeColor = 
      data.riskLevel.toLowerCase() === "critical" ? "#ef4444" : 
      data.riskLevel.toLowerCase() === "high" ? "#f97316" : 
      data.riskLevel.toLowerCase() === "medium" ? "#eab308" : "#22c55e";

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nulltrace Cyber Threat Report - ${Date.now()}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; padding: 40px; margin: 0; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
            .brand span { color: #0ea5e9; }
            .badge { padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; color: white; background: ${riskBadgeColor}; text-transform: uppercase; }
            .title { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; }
            .meta-grid { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .meta-item { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .meta-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
            .meta-val { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 5px; }
            .section-title { font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
            .summary-box { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 30px; font-size: 15px; }
            .risky-box { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
            .risky-tag { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 12px; margin: 3px; border: 1px solid #fca5a5; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">🛡️ NULLTRACE <span>SENTINEL</span></div>
            <div class="badge">${data.riskLevel} RISK DETECTED</div>
          </div>

          <h1 class="title">Threat Intelligence Report</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: -5px; margin-bottom: 25px;">
            Generated on ${new Date().toLocaleString()} by Nulltrace Cyber Sentinel AI Engine
          </p>

          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Trust Score</div>
              <div class="meta-val">${data.trustScore} / 100</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">AI Intent</div>
              <div class="meta-val" style="text-transform: uppercase;">${data.intent}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Emotional Tone</div>
              <div class="meta-val">${data.emotion || "N/A"}</div>
            </div>
          </div>

          <div class="section-title">Forensic Analysis Summary</div>
          <div class="summary-box">
            ${data.analysis}
          </div>

          <div class="section-title">Risky Elements & Threat Indicators</div>
          <div class="risky-box">
            ${
              data.riskyParts && data.riskyParts.length > 0
                ? data.riskyParts.map(part => `<span class="risky-tag">${part}</span>`).join(" ")
                : `<em style="color: #64748b;">No specific high-risk text snippets flagged.</em>`
            }
          </div>

          <div class="footer">
            Confidential Threat Intelligence Document • Generated by Nulltrace AI Security System
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(reportHtml);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 250);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-[40px] p-8 md:p-12 relative overflow-hidden shadow-2xl neon-border scan-line"
    >
      <div className="absolute top-0 right-0 p-8">
        <div className={cn(
          "px-4 py-2 rounded-full border text-xs font-bold tracking-widest uppercase flex items-center space-x-2",
          getRiskColor(data.riskLevel)
        )}>
          {data.riskLevel === "low" ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          <span>{data.riskLevel} Risk Detected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Score Ring */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-6">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform">
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-white/5"
              />
              <motion.circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="12"
                strokeDasharray="552.92"
                initial={{ strokeDashoffset: 552.92 }}
                animate={{ strokeDashoffset: 552.92 - (data.trustScore / 100) * 552.92 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: data.trustScore >= 50 ? 'var(--primary)' : 'var(--danger)' }} />
                  <stop offset="100%" style={{ stopColor: data.trustScore >= 50 ? 'var(--secondary)' : 'var(--danger)' }} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-display font-bold leading-none">{data.trustScore}</span>
              <span className="text-xs uppercase tracking-widest text-foreground/40 font-bold mt-2">Trust Score</span>
            </div>
          </div>
          
          <div className="text-center space-y-1">
            <p className="font-display font-bold text-lg uppercase">{data.intent}</p>
            <p className="text-foreground/40 text-sm font-sans">AI Intent Classification</p>
          </div>
        </div>

        {/* Detailed Explanation */}
        <div className="lg:col-span-8 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-primary">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse neon-text" />
              <h3 className="font-display font-bold text-xl uppercase tracking-wider neon-text">AI Intelligence Report</h3>
            </div>
            <div className="text-lg leading-relaxed text-foreground/80 font-sans">
              {data.analysis.split(/(\s+)/).map((word, i) => {
                const cleanWord = word.replace(/[.,:;!?()]/g, "").toLowerCase();
                const isRisky = data.riskyParts?.some(part => 
                  part.toLowerCase().includes(cleanWord) || 
                  cleanWord.includes(part.toLowerCase())
                ) && cleanWord.length > 2;

                return (
                  <span 
                    key={i} 
                    className={cn(
                      isRisky && "bg-red-400/20 text-red-200 px-1 rounded-sm border-b border-red-400/50 neon-border"
                    )}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Emotional Signals */}
            <div className="bg-surface-low/30 rounded-3xl p-6 border border-white/10 neon-border">
              <div className="flex items-center space-x-2 mb-4 text-foreground/60">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Emotional Tone</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium border border-primary/20 neon-text">
                  {data.emotion}
                </span>
              </div>
            </div>

            {/* Risky Elements */}
            <div className="bg-surface-low/30 rounded-3xl p-6 border border-red-400/20 neon-border md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400 neon-text" />
                <span className="text-xs font-bold uppercase tracking-widest text-red-400 neon-text">Risky Elements Detected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.riskyParts && data.riskyParts.length > 0 ? data.riskyParts.map((part, i) => (
                  <span key={i} className="px-3 py-1.5 bg-red-400/10 text-red-400 rounded-xl text-xs font-mono border border-red-400/30 neon-border">
                    {part}
                  </span>
                )) : (
                  <span className="text-xs text-foreground/20 italic">No specific snippets flagged.</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-foreground/30 font-sans">
              <span className="flex items-center space-x-1">
                <Info className="w-3 h-3" />
                <span>Report incorrect analysis</span>
              </span>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleShare}
                className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors font-display uppercase tracking-widest neon-border hover:neon-text flex items-center space-x-2 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Share Report</span>
                  </>
                )}
              </button>
              <button 
                onClick={handleDownloadPdf}
                className="cyber-button px-6 py-2 rounded-xl text-sm font-bold font-display uppercase tracking-widest flex items-center space-x-2 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
