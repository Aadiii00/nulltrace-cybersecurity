"use client";

import { motion } from "framer-motion";
import { ShieldAlert, CheckCircle2, AlertTriangle, HelpCircle, Info } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { ThreatAnalysis } from "@/types/threats";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ResultCard({ data }: { data: ThreatAnalysis }) {
  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "low": return "text-green-400 border-green-400/30 bg-green-400/10 neon-border";
      case "medium": return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10 neon-border";
      case "high": return "text-orange-400 border-orange-400/30 bg-orange-400/10 neon-border";
      case "critical": return "text-red-400 border-red-400/30 bg-red-400/10 danger-pulse";
      default: return "text-primary border-primary/30 bg-primary/10 neon-border";
    }
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
              <button className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors font-display uppercase tracking-widest neon-border hover:neon-text">Share Report</button>
              <button className="cyber-button px-6 py-2 rounded-xl text-sm font-bold font-display uppercase tracking-widest">Download PDF</button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
