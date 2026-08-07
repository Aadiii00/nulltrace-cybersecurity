"use client";

import { useState, useRef } from "react";
import { Search, Shield, Globe, FileText, Upload, Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ThreatAnalysis } from "@/types/threats";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = "message" | "url" | "file";

interface HeroSectionProps {
  onResult: (result: ThreatAnalysis | null) => void;
  onLoading: (isLoading: boolean) => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function HeroSection({ onResult, onLoading, activeTab, onTabChange }: HeroSectionProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async () => {
    if (!inputValue && activeTab !== "file") return;

    setIsLoading(true);
    onLoading(true);
    onResult(null);

    try {
      let contentToAnalyze = inputValue;

      if (activeTab === "file") {
        const file = fileInputRef.current?.files?.[0];
        if (!file) throw new Error("No file selected");

        const formData = new FormData();
        formData.append("image", file);

        const ocrRes = await fetch("/api/ocr", {
          method: "POST",
          body: formData,
        });
        const ocrData = await ocrRes.json();
        if (ocrData.error) throw new Error(ocrData.error);
        contentToAnalyze = ocrData.text;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentToAnalyze, type: activeTab }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.details || data.error);

      onResult(data);
    } catch (error: any) {
      console.error("Scan error:", error);
      alert(`Analysis failed: ${error.message || "Please check your configuration."}`);
    } finally {
      setIsLoading(false);
      onLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInputValue(file.name);
    }
  };

  return (
    <section className="relative pt-20 pb-16 px-6 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 border-primary/20 bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 border-secondary/20 bg-secondary/20 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center space-x-2 glass px-4 py-2 rounded-full mb-6 neon-border">
            <Zap className="w-4 h-4 text-primary fill-current" />
            <span className="text-xs font-bold tracking-wider uppercase text-primary neon-text font-display">Powered by Gemini Cyber Intelligence</span>
          </div>
          <h1 className="text-4vh md:text-6xl font-display font-bold leading-tight">
            Analyze Anything. <span className="gradient-text">Trust Nothing.</span>
            <br />
            Decide Smart.
          </h1>
          <p className="mt-6 text-foreground/60 text-lg max-w-2xl mx-auto font-sans leading-relaxed">
            <span className="font-mono text-primary font-bold neon-text">[Nulltrace]</span> is your cyber sentinel — scan messages, URLs, voice, and files 
            to neutralize phishing, scams, and social engineering before they reach you.
          </p>
        </motion.div>

        {/* Input Card */}
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-3xl p-1 shadow-2xl relative neon-border scan-line"
          >
            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-surface-low/50 rounded-[22px] mb-1 cyber-grid">
              <TabButton 
                active={activeTab === "message"} 
                onClick={() => { onTabChange("message"); setInputValue(""); }}
                icon={<Shield className="w-4 h-4" />}
                label="Scan Message"
              />
              <TabButton 
                active={activeTab === "url"} 
                onClick={() => { onTabChange("url"); setInputValue(""); }}
                icon={<Globe className="w-4 h-4" />}
                label="Scan URL"
              />
              <TabButton 
                active={activeTab === "file"} 
                onClick={() => { onTabChange("file"); setInputValue(""); }}
                icon={<FileText className="w-4 h-4" />}
                label="Upload File"
              />
            </div>

            <div className="p-4 space-y-4">
              <AnimatePresence mode="wait">
                {activeTab === "message" || activeTab === "url" ? (
                  <motion.div
                    key={`${activeTab}-input`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="relative"
                  >
                    <textarea
                      placeholder={activeTab === "message" ? "Paste message, email, or SMS content here..." : "Enter URL to check (e.g., https://safe-login.com)..."}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={isLoading}
                      className="w-full bg-surface-low/30 rounded-2xl p-6 min-h-[160px] border border-white/5 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all resize-none text-lg text-foreground placeholder:text-foreground/30 font-sans disabled:opacity-50"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="file-upload"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={cn(
                      "border-2 border-dashed border-white/10 rounded-2xl p-12 transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[160px]",
                      isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    <label className={cn("cursor-pointer space-y-4 flex flex-col items-center w-full", isLoading && "cursor-not-allowed")}>
                      <div className="w-16 h-16 rounded-2xl bg-surface-low flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isLoading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <Upload className="w-8 h-8 text-primary" />}
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium font-display">
                          {inputValue || "Click or drag to upload"}
                        </p>
                        <p className="text-sm text-foreground/40 font-sans">Screenshots, PDFs, or Documents (Max 10MB)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        disabled={isLoading}
                        accept="image/*,.pdf" 
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center py-2 px-2">
                <div className="flex items-center space-x-4 text-xs text-foreground/40 font-sans">
                  <span className="flex items-center space-x-1">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span>Real-time scanning</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <div className="w-1 h-1 rounded-full bg-secondary" />
                    <span>Deep Intelligence</span>
                  </span>
                </div>
                <button
                  onClick={handleScan}
                  disabled={isLoading || (!inputValue && activeTab !== "file")}
                  className="cyber-button text-background font-bold px-10 py-4 rounded-2xl flex items-center space-x-3 transition-all active:scale-95 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                  <span className="font-display uppercase tracking-wider text-sm">
                    {isLoading ? "Analyzing..." : "Run Analysis"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col md:flex-row items-center justify-center space-y-1 md:space-y-0 md:space-x-3 py-4 rounded-[18px] text-sm font-medium transition-all relative overflow-hidden z-10",
        active ? "text-primary bg-white/5 shadow-sm" : "text-foreground/40 hover:text-foreground/70 hover:bg-white/[0.02]"
      )}
    >
      <div className={cn("transition-transform", active && "scale-110 shadow-[0_0_10px_var(--primary-glow)]")}>
        {icon}
      </div>
      <span className="font-display text-xs md:text-sm">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-tab-indicator" 
          className="absolute inset-0 bg-white/5 -z-10" 
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}
