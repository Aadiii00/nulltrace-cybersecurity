"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ScanLine, AlertTriangle, CheckCircle, X, ImageIcon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeepfakeResult {
  isAIGenerated: boolean;
  confidence: number;
  reason: string;
}

export default function DeepfakeDetector() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<DeepfakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  const handleFile = (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      setError("Invalid file type. Please upload JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }
    setError(null);
    setResult(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const clearImage = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleScan = async () => {
    if (!selectedFile) return;
    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/deepfake", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Scan failed.");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <section id="deepfake-detector" className="py-16 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest">
            <Zap className="w-3 h-3" />
            AI Vision Analysis
          </div>
          <h2 className="text-3xl font-display font-bold">
            Deepfake <span className="text-primary">Image Detector</span>
          </h2>
          <p className="text-foreground/40 max-w-xl mx-auto text-sm">
            Upload any image to detect whether it was AI-generated or captured by a real camera. Powered by Nulltrace Vision.
          </p>
        </motion.div>

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {!preview ? (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative glass rounded-3xl border-2 border-dashed p-16 cursor-pointer transition-all duration-300 text-center group",
                isDragging
                  ? "border-primary/80 bg-primary/5 scale-[1.01]"
                  : "border-white/10 hover:border-primary/40 hover:bg-white/[0.02]"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
                  isDragging ? "bg-primary/20" : "bg-white/5 group-hover:bg-primary/10"
                )}>
                  <Upload className={cn("w-7 h-7 transition-colors", isDragging ? "text-primary" : "text-foreground/40 group-hover:text-primary")} />
                </div>
                <div>
                  <p className="font-display font-bold text-lg">
                    {isDragging ? "Drop it here!" : "Drag & drop your image"}
                  </p>
                  <p className="text-foreground/40 text-sm mt-1">or click to browse — JPG, PNG, WebP · Max 5MB</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-3xl border border-white/10 overflow-hidden">
              {/* Image Preview */}
              <div className="relative">
                <img
                  src={preview}
                  alt="Uploaded preview"
                  className="w-full max-h-80 object-contain bg-black/40"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-red-500/80 rounded-full flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
                  <ImageIcon className="w-3 h-3 text-primary" />
                  <span className="text-xs text-white/70">{selectedFile?.name}</span>
                </div>
              </div>

              {/* Scan Button */}
              <div className="p-6 flex justify-center">
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  id="deepfake-scan-btn"
                  className={cn(
                    "flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-300",
                    isScanning
                      ? "bg-primary/20 text-primary/60 cursor-not-allowed"
                      : "bg-primary text-black hover:bg-primary/90 hover:scale-105 active:scale-100 shadow-lg shadow-primary/20"
                  )}
                >
                  {isScanning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      Analyzing Image...
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4" />
                      Scan for Deepfake
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Scanning Animation */}
        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass rounded-2xl p-6 border border-primary/20 flex items-center gap-4"
            >
              <div className="relative w-10 h-10 flex-shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              </div>
              <div>
                <p className="font-bold text-primary text-sm">Nulltrace Vision is analyzing the image...</p>
                <p className="text-foreground/40 text-xs mt-0.5">Scanning for GAN artifacts, texture anomalies, lighting inconsistencies</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass rounded-2xl p-4 border border-red-500/30 bg-red-500/5 flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Card */}
        <AnimatePresence>
          {result && (() => {
            // 75% threshold rule: >= 75 = Real, < 75 = Manipulated/AI Generated
            const isReal = result.confidence >= 75;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className={cn(
                  "glass rounded-3xl overflow-hidden border-2",
                  isReal ? "border-green-500/40" : "border-red-500/40"
                )}
              >
                {/* Result Header */}
                <div className={cn(
                  "p-6 flex items-center justify-between",
                  isReal ? "bg-green-500/10" : "bg-red-500/10"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center",
                      isReal ? "bg-green-500/20" : "bg-red-500/20"
                    )}>
                      {isReal
                        ? <CheckCircle className="w-7 h-7 text-green-400" />
                        : <AlertTriangle className="w-7 h-7 text-red-400" />
                      }
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-foreground/40">Detection Result</p>
                      <h3 className={cn(
                        "text-2xl font-display font-bold mt-0.5",
                        isReal ? "text-green-400" : "text-red-400"
                      )}>
                        {isReal ? "✓ Real Image" : "⚠ AI Generated / Manipulated"}
                      </h3>
                      <p className="text-[10px] text-foreground/30 mt-0.5 uppercase tracking-widest">
                        {isReal ? "Confidence ≥ 75% — Authentic" : "Confidence < 75% — Suspicious"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-foreground/40 uppercase tracking-widest mb-1">Confidence</p>
                    <p className={cn(
                      "text-4xl font-display font-bold",
                      isReal ? "text-green-400" : "text-red-400"
                    )}>
                      {result.confidence}%
                    </p>
                    <p className="text-[10px] text-foreground/30 mt-1">
                      Threshold: 75%
                    </p>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="px-6 py-4 border-b border-white/5">
                  <div className="flex items-center justify-between text-xs text-foreground/40 mb-2">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                      Manipulated (&lt;75%)
                    </span>
                    <span className="text-foreground/20">|  75% threshold  |</span>
                    <span className="flex items-center gap-1">
                      Real (≥75%)
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    </span>
                  </div>
                  {/* Full bar showing where the score lands */}
                  <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden">
                    {/* Red zone: 0–74% */}
                    <div className="absolute left-0 top-0 h-full w-[75%] bg-gradient-to-r from-red-600/40 to-orange-500/30 rounded-l-full" />
                    {/* Green zone: 75–100% */}
                    <div className="absolute right-0 top-0 h-full w-[25%] bg-gradient-to-r from-green-500/30 to-emerald-400/40 rounded-r-full" />
                    {/* Threshold line */}
                    <div className="absolute top-0 h-full w-0.5 bg-white/30" style={{ left: "75%" }} />
                    {/* Score indicator */}
                    <motion.div
                      initial={{ left: 0 }}
                      animate={{ left: `calc(${result.confidence}% - 6px)` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg",
                        isReal ? "bg-green-400" : "bg-red-400"
                      )}
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-foreground/30">Score: {result.confidence}%</span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="p-6 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground/30">Technical Analysis</p>
                  <p className="text-foreground/70 text-sm leading-relaxed">{result.reason}</p>
                </div>

                {/* Footer Tag */}
                <div className="px-6 pb-6">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase border",
                    isReal
                      ? "text-green-400 bg-green-400/10 border-green-400/20"
                      : "text-red-400 bg-red-400/10 border-red-400/20"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isReal ? "bg-green-400" : "bg-red-400")} />
                    {isReal ? "Image verified as authentic" : "Deepfake alert sent to webhook"}
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </section>
  );
}
