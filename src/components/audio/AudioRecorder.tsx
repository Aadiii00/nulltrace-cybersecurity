'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string, analysis: any) => void;
  onError: (error: string) => void;
}

export default function AudioRecorder({ onTranscriptionComplete, onError }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Audio Visualizer
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      analyserRef.current = analyser;
      audioContextRef.current = audioContext;
      
      const updateLevel = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 128); // Normalize 0-1
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
        
        // Cleanup stream
        stream.getTracks().forEach(track => track.stop());
        if (audioContext.state !== 'closed') await audioContext.close();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Microphone Error:', err);
      onError('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleTranscription = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.text) {
        onTranscriptionComplete(data.text, data.analysis || null);
      } else {
        throw new Error(data.error || 'Server processing error');
      }
    } catch (err: any) {
      onError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-[#0f172a]/50 rounded-3xl border border-white/10 backdrop-blur-xl">
      <div className="relative flex items-center justify-center w-32 h-32">
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1 + (audioLevel * 0.5), 
                opacity: 1,
                boxShadow: `0 0 ${20 + audioLevel * 50}px rgba(34, 211, 238, 0.4)`
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 bg-cyan-400/20 rounded-full"
            />
          )}
        </AnimatePresence>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 group
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
              : 'bg-cyan-500 hover:bg-cyan-600 hover:scale-105 shadow-[0_0_30px_rgba(34,211,238,0.4)]'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isProcessing ? (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          ) : isRecording ? (
            <Square className="w-10 h-10 text-white fill-current" />
          ) : (
            <Mic className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      <div className="text-center space-y-2">
        <p className="text-xl font-bold text-white font-mono tracking-widest">
          {isRecording ? formatTime(recordingTime) : isProcessing ? 'ANALYZING...' : 'READY TO RECORD'}
        </p>
        <p className="text-sm text-white/50 uppercase tracking-widest">
          {isRecording ? 'Capturing High-Fidelity Audio' : isProcessing ? 'Transcribing & Analysing with AI...' : 'Secure Microphone Uplink'}
        </p>
      </div>

      {isRecording && (
        <div className="flex gap-1 h-8 items-end">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: [8, 8 + (Math.random() * 24 * audioLevel), 8] }}
              transition={{ repeat: Infinity, duration: 0.2, delay: i * 0.05 }}
              className="w-1 bg-cyan-400 rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  );
}
