'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileAudio, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioUploaderProps {
  onTranscriptionComplete: (text: string, analysis: any) => void;
  onError: (error: string) => void;
}

export default function AudioUploader({ onTranscriptionComplete, onError }: AudioUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/webm', 'audio/ogg'];
    // Some systems may not provide a mime type for m4a
    const isM4A = file.name.endsWith('.m4a');
    
    if (!validTypes.includes(file.type) && !isM4A) {
      onError('Invalid file format. Please upload MP3, WAV, or M4A.');
      return;
    }
    
    if (file.size > 25 * 1024 * 1024) {
      onError('File too large. Max size is 25MB.');
      return;
    }

    setFile(file);
    handleTranscription(file);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTranscription = async (fileToUpload: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.text) {
        onTranscriptionComplete(data.text, data.analysis || null);
      } else {
        throw new Error(data.error || 'Transcription failed');
      }
    } catch (err: any) {
      onError(err.message);
      removeFile();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`relative group h-48 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer 
              ${dragActive 
                ? 'border-cyan-400 bg-cyan-400/5 shadow-[0_0_30px_rgba(34,211,238,0.2)]' 
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.webm,.ogg"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="p-4 rounded-2xl bg-white/5 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="mt-4 text-center">
              <p className="text-white font-semibold">Drop Audio File Here</p>
              <p className="text-white/40 text-sm">MP3, WAV, or M4A (Max 25MB)</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 p-5 bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-cyan-500/10 rounded-xl">
              <FileAudio className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{file.name}</p>
              <p className="text-xs text-white/40">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            
            {isUploading ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs font-bold text-white tracking-widest uppercase">Transcribing & Analyzing...</span>
              </div>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); removeFile(); }}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                title="Discard forensic sample"
              >
                <X className="w-5 h-5 text-white/40 hover:text-white" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
