"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  Upload, 
  FileAudio, 
  ShieldCheck, 
  ShieldAlert, 
  Download, 
  Copy, 
  RefreshCw, 
  ArrowLeft, 
  History, 
  Clock, 
  FileJson, 
  FileText, 
  Check, 
  AlertTriangle,
  Play,
  Square,
  Info
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface DetectionResult {
  voiceType: string;
  confidence: number;
  spoofProbability: number;
  riskLevel: string;
  summary: string;
  audioUrl?: string;
  detectionTimeSec?: string;
  modelUsed?: string;
  fileName?: string;
}

export default function VoiceDetectorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "record">("upload");
  const [isDragOver, setIsDragOver] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Inference states
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  // History states
  const [scans, setScans] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch scans history — works for both logged-in users and anonymous visitors
  const fetchScansHistory = async () => {
    try {
      setIsHistoryLoading(true);
      let query = supabase
        .from("voice_detector_scans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      // If logged in, show only their scans; otherwise show recent anonymous scans
      if (user) {
        query = query.eq("user_id", user.id);
      } else {
        query = query.is("user_id", null);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        console.error("Failed to load voice scans history:", dbError.message);
      } else if (data) {
        setScans(data);
      }
    } catch (e) {
      console.error("Failed to load voice scans history:", e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Reload history on user change + set up realtime subscription for auto-refresh
  useEffect(() => {
    fetchScansHistory();

    // Subscribe to new inserts so history updates automatically after each scan
    const channel = supabase
      .channel("voice_detector_scans_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "voice_detector_scans" },
        () => {
          fetchScansHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Audio Duration Listener
  const handleAudioLoadMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setDuration(e.currentTarget.duration);
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    const validExtensions = [".wav", ".mp3", ".ogg", ".m4a", ".webm"];
    const fileExt = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(fileExt) && !file.type.startsWith("audio/")) {
      setError("Unsupported file format. Please upload wav, mp3, ogg, m4a, or webm.");
      return;
    }
    
    if (file.size > 20 * 1024 * 1024) {
      setError("File exceeds the maximum limit of 20MB.");
      return;
    }
    
    setError(null);
    setAudioFile(file);
    setResult(null);
    
    const objectUrl = URL.createObjectURL(file);
    setAudioUrl(objectUrl);
  };

  // Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        processSelectedFile(file);
        
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("Microphone permission denied or unsupported device.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Analysis Handler
  const handleAnalyze = async () => {
    if (!audioFile) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("audio", audioFile);

    try {
      const res = await fetch("/api/voice-detector", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || errData.details || "API Analysis failed");
      }

      const data = await res.json();
      setResult(data);
      fetchScansHistory(); // refresh history list
    } catch (err: any) {
      setError(err.message || "Failed to reach AI detection service. Verify your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset State
  const handleReset = () => {
    setAudioFile(null);
    setAudioUrl(null);
    setDuration(null);
    setResult(null);
    setError(null);
  };

  // Export Helpers
  const copyAnalysis = () => {
    if (!result) return;
    const text = `Nulltrace AI Voice Detector Report
--------------------------------------
Result: ${result.voiceType}
Confidence: ${result.confidence}%
Spoof Probability: ${result.spoofProbability}
Risk Level: ${result.riskLevel}
Summary: ${result.summary}
Model Used: ${result.modelUsed || "lab260/Spectra-AASIST3"}
Analyzed Time: ${result.detectionTimeSec ? result.detectionTimeSec + 's' : 'N/A'}
Audio Duration: ${duration ? duration.toFixed(1) + 's' : 'N/A'}
Recommendation: ${
      result.voiceType === "AI Generated"
        ? "This recording may have been created using AI voice synthesis or voice cloning technology. Verify the source before trusting any information."
        : "This recording appears to be authentic. No spoofing signatures were identified."
    }`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadJson = () => {
    if (!result) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify({ ...result, durationSeconds: duration }, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `nulltrace-voice-analysis-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const downloadPdfReport = () => {
    if (!result) return;
    
    // Create iframe for printing
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

    const riskColor = 
      result.riskLevel === "CRITICAL" ? "#ef4444" : 
      result.riskLevel === "HIGH" ? "#f97316" : 
      result.riskLevel === "MEDIUM" ? "#eab308" : "#22c55e";

    const reportHtml = `
      <html>
        <head>
          <title>AI Voice Forensics Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: -0.5px; }
            .brand span { color: #06b6d4; }
            .badge { padding: 6px 16px; border-radius: 9999px; font-size: 14px; font-weight: bold; color: white; background: ${riskColor}; }
            .title { font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; }
            .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .meta-item { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .meta-label { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; letter-spacing: 0.5px; }
            .meta-val { font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 5px; }
            .summary-box { background: #ecfeff; border-left: 4px solid #06b6d4; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
            .recommendation { background: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 12px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">NULLTRACE <span>SENTINEL</span></div>
            <div class="badge">${result.riskLevel} RISK</div>
          </div>
          
          <h1 class="title">AI Voice Authenticity Report</h1>
          <p style="color: #64748b; margin-top: -10px; margin-bottom: 30px;">Digital Forensic Audio Intelligence & Anti-Spoofing Scan</p>
          
          <div class="summary-box">
            <div class="meta-label">Forensic Summary</div>
            <p style="font-size: 16px; font-weight: 500; margin: 5px 0 0 0; color: #0e7490;">${result.summary}</p>
          </div>

          <div class="section-title">Scan Metadata</div>
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Voice Authenticity</div>
              <div class="meta-val" style="color: ${result.voiceType === "AI Generated" ? "#ef4444" : "#22c55e"}">${result.voiceType}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Model Confidence Score</div>
              <div class="meta-val">${result.confidence}%</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Spoof Probability</div>
              <div class="meta-val">${result.spoofProbability}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Target File Name</div>
              <div class="meta-val">${result.fileName || "audio-forensics.wav"}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Model Architecture</div>
              <div class="meta-val">${result.modelUsed || "lab260/Spectra-AASIST3"}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Audio Duration / Process Time</div>
              <div class="meta-val">${duration ? duration.toFixed(1) : "N/A"}s / ${result.detectionTimeSec || "N/A"}s</div>
            </div>
          </div>

          <div class="section-title">Cybersecurity Recommendation</div>
          <div class="recommendation">
            <p style="margin: 0; font-size: 14px; color: #b45309; font-weight: 500;">
              ${
                result.voiceType === "AI Generated"
                  ? "CRITICAL ALERT: This recording matches AI voice synthesis, cloning or deepfake speech models. Do NOT verify identity or execute actions based solely on this audio. Confirm via secondary channels."
                  : "AUTHENTIC SPEECH: No digital voice spoofing or neural audio cloning signatures were detected. Recording matches human vocal biological profiles."
              }
            </p>
          </div>

          <div class="footer">
            Generated by Nulltrace Sentinel HUD Platform • ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(reportHtml);
    doc.close();

    iframe.contentWindow?.focus();
    // Wait for content to render and trigger print
    setTimeout(() => {
      iframe.contentWindow?.print();
      // remove iframe after print dialog opens
      setTimeout(() => iframe.remove(), 1000);
    }, 500);
  };

  // Helpers for styling
  const getRiskColor = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case "CRITICAL": return "#ef4444";
      case "HIGH": return "#f97316";
      case "MEDIUM": return "#eab308";
      default: return "#22c55e";
    }
  };

  const getRiskGlowClass = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case "CRITICAL": return "shadow-[0_0_50px_rgba(239,68,68,0.25)] border-red-500/30 bg-red-950/5";
      case "HIGH": return "shadow-[0_0_50px_rgba(249,115,22,0.25)] border-orange-500/30 bg-orange-950/5";
      case "MEDIUM": return "shadow-[0_0_50px_rgba(234,179,8,0.25)] border-yellow-500/30 bg-yellow-950/5";
      default: return "shadow-[0_0_50px_rgba(34,211,238,0.25)] border-cyan-500/30 bg-cyan-950/5";
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Convert probability to color position
  const getRiskMeterPercentage = (prob: number) => {
    return Math.min(100, Math.max(0, prob * 100));
  };

  // Authenticity percent (class 1 probability)
  const getAuthenticityPercentage = () => {
    if (!result) return 0;
    if (result.voiceType === "Human Voice") {
      return result.confidence;
    } else {
      return Math.round(100 - result.confidence);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white selection:bg-cyan-500/30">
      <Navbar />
      
      <div className="relative pt-32 pb-20 px-4 md:px-8 max-w-6xl mx-auto">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-white/40 hover:text-cyan-400 transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Back to Dashboard</span>
          </Link>

          <header className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20">
                <Mic className="w-6 h-6 text-cyan-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight">
                AI Voice <span className="text-cyan-400">Detector</span>
              </h1>
            </div>
            <p className="text-lg text-white/60 max-w-2xl leading-relaxed">
              Forensic anti-spoofing analyzer. Check audio files for synthetic generation, vocal clones, and deepfake speech manipulation using deep graph network architectures.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Control Panel */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-8">
              {!audioFile ? (
                <div className="glass rounded-[40px] p-8 border-white/5 space-y-8">
                  <div className="flex p-1 bg-white/5 rounded-2xl">
                    <button
                      onClick={() => { setActiveTab("upload"); setError(null); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all
                        ${activeTab === "upload" ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-white/40 hover:text-white"}
                      `}
                    >
                      <Upload className="w-4 h-4" />
                      Upload Audio
                    </button>
                    <button
                      onClick={() => { setActiveTab("record"); setError(null); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all
                        ${activeTab === "record" ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-white/40 hover:text-white"}
                      `}
                    >
                      <Mic className="w-4 h-4" />
                      Record Live
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === "upload" ? (
                      <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div 
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-10 hover:border-cyan-500/50 transition-all group bg-white/[0.01] relative overflow-hidden min-h-[220px]
                            ${isDragOver ? "border-cyan-500 bg-cyan-500/5" : "border-white/10"}
                          `}
                        >
                          <input 
                            type="file" 
                            accept="audio/wav, audio/mp3, audio/mpeg, audio/ogg, audio/m4a, audio/webm, audio/x-m4a"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          
                          <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                              <FileAudio className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="text-lg font-bold">Drag & Drop Audio</p>
                              <p className="text-xs text-white/40 mt-1">Supports WAV, MP3, OGG, M4A, WEBM (Max 20MB)</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="record"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center justify-center border border-white/10 bg-white/[0.01] rounded-[32px] p-10 min-h-[220px] space-y-6"
                      >
                        {isRecording ? (
                          <div className="flex flex-col items-center space-y-4">
                            <div className="relative">
                              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/40 relative">
                                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                                <Mic className="w-8 h-8 text-red-500" />
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</p>
                              <p className="text-xs text-white/40 mt-1">Recording from microphone...</p>
                            </div>

                            <button 
                              onClick={stopRecording}
                              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" /> Stop Record
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                              <Mic className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                              <p className="text-lg font-bold">Record Audio Sample</p>
                              <p className="text-xs text-white/40 mt-1">Click the button below to initialize live capture</p>
                            </div>
                            <button 
                              onClick={startRecording}
                              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-black rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" /> Start Record
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs"
                    >
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <p>{error}</p>
                    </motion.div>
                  )}

                  <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Max Size</p>
                      <span className="text-xs font-bold text-white">20 MB</span>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Encrypted</p>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white">AES-256</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass rounded-[40px] p-8 border-white/5 space-y-6">
                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
                        <FileAudio className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{audioFile.name}</p>
                        <p className="text-xs text-white/40 mt-0.5">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleReset}
                      disabled={isLoading}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all disabled:opacity-50"
                      title="Clear file"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {audioUrl && (
                    <div className="bg-black/30 border border-white/5 p-4 rounded-3xl space-y-2">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Audio Player</p>
                      <audio 
                        src={audioUrl} 
                        controls 
                        className="w-full" 
                        onLoadedMetadata={handleAudioLoadMetadata}
                      />
                      {duration && (
                        <p className="text-[10px] text-white/40 text-right">Duration: {duration.toFixed(1)}s</p>
                      )}
                    </div>
                  )}

                  {!result && (
                    <button
                      onClick={handleAnalyze}
                      disabled={isLoading}
                      className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-black rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Processing Voice...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Start Voice Scan
                        </>
                      )}
                    </button>
                  )}
                  
                  {result && (
                    <button 
                      onClick={handleReset}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white/60 uppercase tracking-widest transition-all"
                    >
                      New Forensic Sample
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-12 xl:col-span-7">
              <AnimatePresence mode="wait">
                {isLoading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="glass rounded-[40px] p-16 flex flex-col items-center justify-center space-y-8 text-center min-h-[450px] border border-white/5"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-24 h-24 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                      <div className="absolute w-14 h-14 border-4 border-purple-500/20 border-b-purple-400 rounded-full animate-spin [animation-duration:1.2s]" />
                      <Mic className="absolute w-6 h-6 text-cyan-400 animate-pulse" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-display font-bold uppercase tracking-widest text-cyan-400">Spectrogram Analysis</h3>
                      <p className="text-white/40 text-sm font-sans tracking-wide max-w-sm">
                        Decompressing vocal envelope and extracting neural spectro-temporal graph vectors...
                      </p>
                    </div>
                  </motion.div>
                )}

                {result && !isLoading && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass rounded-[40px] p-8 md:p-10 border transition-all duration-300 ${getRiskGlowClass(result.riskLevel)}`}
                  >
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6 mb-8">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                          style={{ 
                            borderColor: `${getRiskColor(result.riskLevel)}40`, 
                            backgroundColor: `${getRiskColor(result.riskLevel)}15` 
                          }}
                        >
                          {result.voiceType === "AI Generated" ? (
                            <ShieldAlert className="w-6 h-6" style={{ color: getRiskColor(result.riskLevel) }} />
                          ) : (
                            <ShieldCheck className="w-6 h-6" style={{ color: getRiskColor(result.riskLevel) }} />
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest font-mono">Voice Authenticity</span>
                          <h2 className="text-2xl font-display font-bold mt-0.5">{result.voiceType}</h2>
                        </div>
                      </div>

                      {/* Export buttons */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={copyAnalysis}
                          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                          title="Copy Report"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={downloadJson}
                          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                          title="Download JSON"
                        >
                          <FileJson className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={downloadPdfReport}
                          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                          title="Download PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-8">
                      {/* Left: Circular confidence gauge */}
                      <div className="md:col-span-5 flex flex-col items-center justify-center">
                        <div className="relative w-40 h-40 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90 transform">
                            <circle
                              cx="80"
                              cy="80"
                              r="70"
                              fill="none"
                              stroke="rgba(255,255,255,0.03)"
                              strokeWidth="8"
                            />
                            <motion.circle
                              cx="80"
                              cy="80"
                              r="70"
                              fill="none"
                              stroke={getRiskColor(result.riskLevel)}
                              strokeWidth="8"
                              strokeDasharray="439.8"
                              initial={{ strokeDashoffset: 439.8 }}
                              animate={{ strokeDashoffset: 439.8 - (getAuthenticityPercentage() / 100) * 439.8 }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-display font-extrabold leading-none">
                              {getAuthenticityPercentage()}%
                            </span>
                            <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold mt-1">Authentic</span>
                          </div>
                        </div>
                        <p className="text-xs text-white/50 mt-4 text-center">
                          Authenticity score measures vocal organic biology signatures.
                        </p>
                      </div>

                      {/* Right: Metrics & Risk */}
                      <div className="md:col-span-7 space-y-6">
                        {/* Summary */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Findings Summary</p>
                          <p className="text-sm font-semibold text-white/90 mt-1">{result.summary}</p>
                        </div>

                        {/* Horizontal Risk Meter */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/40 font-bold uppercase tracking-wider">Risk Level</span>
                            <span className="font-bold uppercase tracking-widest" style={{ color: getRiskColor(result.riskLevel) }}>
                              {result.riskLevel}
                            </span>
                          </div>
                          
                          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                            {/* Color bands */}
                            <div className="absolute inset-0 flex">
                              <div className="w-1/4 h-full bg-green-500/25" />
                              <div className="w-1/4 h-full bg-yellow-500/25" />
                              <div className="w-1/4 h-full bg-orange-500/25" />
                              <div className="w-1/4 h-full bg-red-500/25" />
                            </div>
                            
                            {/* Pointer indicator */}
                            <div 
                              className="absolute top-0 bottom-0 w-2 bg-white border border-black shadow transition-all duration-1000"
                              style={{ 
                                left: `${getRiskMeterPercentage(result.spoofProbability)}%`,
                                transform: 'translateX(-50%)',
                                backgroundColor: getRiskColor(result.riskLevel)
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-white/30 font-bold font-mono">
                            <span>LOW</span>
                            <span>MEDIUM</span>
                            <span>HIGH</span>
                            <span>CRITICAL</span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="bg-white/[0.01] p-3 border border-white/5 rounded-xl">
                            <span className="text-white/30 block uppercase tracking-wider text-[9px]">Spoof Prob</span>
                            <span className="font-bold text-sm text-white/90 mt-1 block">{result.spoofProbability}</span>
                          </div>
                          <div className="bg-white/[0.01] p-3 border border-white/5 rounded-xl">
                            <span className="text-white/30 block uppercase tracking-wider text-[9px]">Model Confidence</span>
                            <span className="font-bold text-sm text-white/90 mt-1 block">{result.confidence}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-6 text-xs">
                      <div>
                        <span className="text-white/30 block">Model Used</span>
                        <span className="font-semibold text-white/80 mt-1 block">{result.modelUsed || "Spectra-AASIST3"}</span>
                      </div>
                      <div>
                        <span className="text-white/30 block">Detection Time</span>
                        <span className="font-semibold text-white/80 mt-1 block">{result.detectionTimeSec || "0.45"}s</span>
                      </div>
                      <div>
                        <span className="text-white/30 block">Audio Duration</span>
                        <span className="font-semibold text-white/80 mt-1 block">{duration ? duration.toFixed(1) + 's' : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-white/30 block">Format Detected</span>
                        <span className="font-semibold text-white/80 mt-1 block uppercase">
                          {audioFile?.name.split(".").pop() || "WAV"}
                        </span>
                      </div>
                    </div>

                    {/* Recommendation Card */}
                    <div className="mt-8 bg-yellow-500/5 border border-yellow-500/10 p-5 rounded-3xl flex items-start gap-4">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-yellow-500">Security Recommendation</p>
                        <p className="text-xs text-white/70 leading-relaxed">
                          {result.voiceType === "AI Generated"
                            ? "This recording may have been created using AI voice synthesis or voice cloning technology. Verify the source before trusting any information."
                            : "This recording matches standard organic human speech patterns. However, always remain vigilant against social engineering tactics."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!result && !isLoading && (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full min-h-[450px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-[40px] opacity-40 grayscale"
                  >
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                      <History className="w-10 h-10 text-white/20" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">Awaiting Audio Feed</h3>
                    <p className="text-white/40 max-w-sm text-sm">Upload an audio recording or record a live microphone sample to run neural authenticity classification.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* History Section */}
          <div className="glass rounded-[32px] overflow-hidden border-white/5 mt-12">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="text-cyan-400 w-5 h-5" />
                <h3 className="font-display font-bold uppercase tracking-wider text-sm">AI Voice Detection History</h3>
              </div>
              <button 
                onClick={fetchScansHistory}
                className="p-2 hover:bg-white/5 rounded-xl transition-all"
                title="Refresh Logs"
              >
                <RefreshCw className={`w-4 h-4 ${isHistoryLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-white/30 border-b border-white/5">
                    <th className="px-8 py-4">File Name</th>
                    <th className="px-8 py-4">Authenticity</th>
                    <th className="px-8 py-4">Confidence</th>
                    <th className="px-8 py-4">Risk Level</th>
                    <th className="px-8 py-4">Timestamp</th>
                    <th className="px-8 py-4">Audio Scan</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/[0.02]">
                  {isHistoryLoading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-white/20 italic">Loading scan records...</td>
                    </tr>
                  ) : scans.length > 0 ? (
                    scans.map((scan, idx) => (
                      <tr key={scan.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-8 py-5 font-semibold text-white/80 max-w-xs truncate">
                          {scan.file_name || "audio-analysis.wav"}
                        </td>
                        <td className={`px-8 py-5 font-bold ${scan.voice_type === "AI Generated" ? "text-red-400" : "text-green-400"}`}>
                          {scan.voice_type}
                        </td>
                        <td className="px-8 py-5 font-bold font-mono">
                          {scan.confidence}%
                        </td>
                        <td className="px-8 py-5">
                          <span 
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border"
                            style={{ 
                              color: getRiskColor(scan.risk_level),
                              borderColor: `${getRiskColor(scan.risk_level)}30`,
                              backgroundColor: `${getRiskColor(scan.risk_level)}10` 
                            }}
                          >
                            {scan.risk_level}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-xs text-white/30">
                          {new Date(scan.created_at).toLocaleString()}
                        </td>
                        <td className="px-8 py-5">
                          {scan.audio_url ? (
                            <audio src={scan.audio_url} controls className="h-8 max-w-xs" />
                          ) : (
                            <span className="text-white/20 text-xs italic">No audio saved</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-white/20 italic">
                        {user ? "No voice scans recorded yet. Run a scan to see your history." : "No recent scans found. Upload an audio file and run a scan to populate history."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
