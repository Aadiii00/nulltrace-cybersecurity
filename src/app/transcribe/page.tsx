'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Upload, FileAudio, ShieldCheck, Info, ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';

import AudioRecorder from '@/components/audio/AudioRecorder';
import AudioUploader from '@/components/audio/AudioUploader';
import TranscriptViewer from '@/components/audio/TranscriptViewer';
import ResultCard from '@/components/ResultCard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function TranscribePage() {
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setTranscript(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-[#020617] selection:bg-cyan-500/30">
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
            <span className="text-xs font-bold uppercase tracking-widest">Back to Hub</span>
          </Link>

          <header className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20">
                <FileAudio className="w-6 h-6 text-cyan-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight">
                Voice <span className="text-cyan-400">Sentinel</span>
              </h1>
            </div>
            <p className="text-lg text-white/60 max-w-2xl leading-relaxed">
              Neural transcription engine for forensic audio analysis. Convert voice messages into verified intelligence and scan for social engineering threats.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Control Panel */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-8">
              {!transcript ? (
                <div className="glass rounded-[40px] p-8 border-white/5 space-y-8">
                  <div className="flex p-1 bg-white/5 rounded-2xl">
                    <button
                      onClick={() => setActiveTab('record')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all
                        ${activeTab === 'record' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-white/40 hover:text-white'}
                      `}
                    >
                      <Mic className="w-4 h-4" />
                      Live Capture
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all
                        ${activeTab === 'upload' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-white/40 hover:text-white'}
                      `}
                    >
                      <Upload className="w-4 h-4" />
                      Forensic Upload
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === 'record' ? (
                      <motion.div
                        key="record"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <AudioRecorder 
                          onTranscriptionComplete={(text, analysis) => {
                            setTranscript(text);
                            if (analysis) setAnalysisResult(analysis);
                          }} 
                          onError={(msg) => setError(msg)} 
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="upload"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <AudioUploader 
                          onTranscriptionComplete={(text, analysis) => {
                            setTranscript(text);
                            if (analysis) setAnalysisResult(analysis);
                          }} 
                          onError={(msg) => setError(msg)} 
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm"
                    >
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <p>{error}</p>
                    </motion.div>
                  )}

                  <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold text-white">READY</span>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Encrypted</p>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white">TLS 1.3</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                   <button 
                    onClick={resetState}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl text-xs font-bold text-white/60 uppercase tracking-widest transition-all"
                  >
                    <Mic className="w-4 h-4" />
                    New Forensic Sample
                  </button>
                    <TranscriptViewer 
                      transcript={transcript} 
                      onAnalyze={(result) => setAnalysisResult(result)} 
                    />
                </div>
              )}
            </div>

            {/* Results Sidebar / Main */}
            <div className="lg:col-span-12 xl:col-span-7">
              <AnimatePresence mode="wait">
                {analysisResult ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <ResultCard data={analysisResult} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-[40px] opacity-40 grayscale"
                  >
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                      <History className="w-10 h-10 text-white/20" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">Awaiting Live Feed</h3>
                    <p className="text-white/40 max-w-sm">Capture audio or upload a recording to initialize neural forensic analysis.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
