'use client';

import React, { useState } from 'react';
import { Copy, CheckCircle2, FileText, Mic2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface TranscriptViewerProps {
  transcript: string;
  onAnalyze?: (result: any) => void; // kept for API compatibility, unused
}

export default function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-widest uppercase">Verified Transcript</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 uppercase tracking-widest font-bold">Deepgram Nova-2</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold text-green-400 uppercase">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
              <span className="text-xs font-bold text-white/40 group-hover:text-white transition-colors uppercase">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Transcript Body */}
      <div className="p-8">
        <div className="relative p-6 bg-black/40 rounded-2xl border border-white/5 font-mono text-sm leading-relaxed text-white/80 min-h-[120px] max-h-56 overflow-y-auto">
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <Mic2 className="w-3 h-3 text-white/20" />
            <span className="text-[10px] text-white/20 uppercase tracking-tighter">Neural Capture · Verified</span>
          </div>
          <p className="mt-6 whitespace-pre-wrap">{transcript}</p>
        </div>

        {/* Analysis auto-running badge */}
        <div className="mt-5 flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
            AI threat analysis complete — see results panel →
          </p>
        </div>
      </div>
    </motion.div>
  );
}
