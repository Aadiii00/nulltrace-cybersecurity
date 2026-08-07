"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TOOLS, ToolDefinition } from "@/lib/constants";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ResultCard from "@/components/ResultCard";
import { ThreatAnalysis } from "@/types/threats";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, ShieldCheck, Info, Camera, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import Tesseract from "tesseract.js";

export default function ToolPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tool, setTool] = useState<ToolDefinition | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState<ThreatAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const foundTool = TOOLS.find((t) => t.id === id);
    if (!foundTool) {
      router.push("/#tools");
      return;
    }
    setTool(foundTool);
  }, [id, router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsOcrLoading(true);
    setError(null);

    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      setInputValue(text);
    } catch (err) {
      setError("OCR failed to extract text from image.");
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!inputValue.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: inputValue,
          type: tool?.tab || "message",
          toolContext: tool?.systemPrompt,
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!tool) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Back Button */}
          <Link 
            href="/#tools" 
            className="inline-flex items-center space-x-2 text-foreground/40 hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Suite</span>
          </Link>

          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <tool.icon className="w-6 h-6" />
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold">
                {tool.title}
              </h1>
            </div>
            <p className="text-xl text-foreground/60 font-sans max-w-2xl leading-relaxed">
              {tool.description}
            </p>
          </div>

          {/* Input Interface */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-[40px] p-8 md:p-12 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8">
              <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-foreground/10">
                <ShieldCheck className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-8">
              {tool.tab === "file" ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[32px] p-12 hover:border-primary/50 transition-all group bg-white/[0.02] relative overflow-hidden">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    
                    {previewUrl ? (
                      <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden border border-white/10">
                        <img src={previewUrl} alt="Scan Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="text-white w-8 h-8" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Camera className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-lg font-bold">Drop evidence here</p>
                          <p className="text-sm text-foreground/40 font-sans">Upload screenshot for AI forensic analysis</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {isOcrLoading && (
                    <div className="flex items-center justify-center space-x-3 text-primary animate-pulse py-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-widest">Neural OCR Active...</span>
                    </div>
                  )}

                  {inputValue && !isOcrLoading && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
                      <label className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Extracted forensic text</label>
                      <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[150px] resize-none"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    {tool.tab === "url" ? "Target URL for Analysis" : "Input Content to Forensic Scan"}
                  </label>
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={tool.tab === "url" ? "Paste suspicious URL here..." : "Paste message or content here..."}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-lg font-sans focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[200px] resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-foreground/30 font-sans">
                  <Info className="w-4 h-4" />
                  <span>Powered by Gemini 2.5 Flash Intelligence</span>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-primary text-background px-8 py-4 rounded-2xl font-bold font-display uppercase tracking-widest flex items-center space-x-2 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-background/20 border-t-background rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Start Analysis</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Results Area */}
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-[40px] p-24 flex flex-col items-center justify-center space-y-6 text-center"
              >
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-secondary/20 border-b-secondary rounded-full animate-spin [animation-duration:1s]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-display font-bold uppercase tracking-widest text-primary">Decoding Threats</p>
                  <p className="text-foreground/40 text-sm font-sans tracking-wider">Cyber Sentinel is performing deep forensic analysis...</p>
                </div>
              </motion.div>
            )}

            {result && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary">
                    Live Analysis Result
                  </div>
                  <h2 className="text-3xl font-display font-bold">Threat Intelligence Report</h2>
                </div>
                <ResultCard data={result} />
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-500 text-center font-sans"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
