"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Share2, 
  Eye,
  MessageSquare,
  Globe,
  FileText,
  TrendingUp,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CommunityFeed() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScans() {
      try {
        const res = await fetch("/api/scans");
        const data = await res.json();
        setScans(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch community scans", err);
      } finally {
        setLoading(false);
      }
    }
    fetchScans();
    
    // Simulate real-time updates every 30 seconds
    const interval = setInterval(fetchScans, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-32 pb-20 px-6 max-w-5xl mx-auto space-y-12">
        <header className="flex flex-col items-center text-center space-y-4">
          <div className="inline-flex items-center space-x-2 bg-secondary/10 border border-secondary/20 px-4 py-1.5 rounded-full text-secondary text-xs font-bold uppercase tracking-widest">
            <Activity className="w-3 h-3" />
            <span>Live Intelligence Feed</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">Community <span className="text-primary">Threat Response</span></h1>
          <p className="text-foreground/40 max-w-2xl font-sans">
            Real-time anonymized intelligence shared by the DetectoAI collective to preemptively identify global fraud patterns.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="md:col-span-2 space-y-6">
            <AnimatePresence mode="popLayout">
              {scans.map((scan, i) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="glass rounded-[32px] p-6 border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        {scan.type === 'message' && <MessageSquare className="w-5 h-5 text-primary" />}
                        {scan.type === 'url' && <Globe className="w-5 h-5 text-secondary" />}
                        {scan.type === 'file' && <FileText className="w-5 h-5 text-foreground/40" />}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm uppercase tracking-wide">
                          {scan.type === 'message' ? 'Inbound Message' : scan.type === 'url' ? 'Suspicious Link' : 'Forensic File'}
                        </h3>
                        <div className="flex items-center space-x-2 text-[10px] text-foreground/30 font-sans uppercase tracking-widest font-bold">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(scan.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase border",
                      scan.risk_level === 'critical' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                      scan.risk_level === 'high' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
                      'text-green-400 bg-green-400/10 border-green-400/20'
                    )}>
                      {scan.risk_level} Risk
                    </div>
                  </div>

                  <p className="text-sm text-foreground/60 font-sans line-clamp-2 italic mb-4">
                    "{scan.input.substring(0, 150)}..."
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-[10px] text-foreground/40">
                        <Shield className="w-3 h-3" />
                        <span>AI Verified</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-foreground/40">
                        <TrendingUp className="w-3 h-3" />
                        <span>Score: {scan.trust_score}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                       <button className="p-2 text-foreground/40 hover:text-primary transition-colors"><Eye className="w-4 h-4" /></button>
                       <button className="p-2 text-foreground/40 hover:text-secondary transition-colors"><Share2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Sidebar / Stats */}
          <div className="space-y-6">
            <div className="glass rounded-[32px] p-6 border-white/5">
              <h3 className="font-display font-bold uppercase tracking-wider mb-4 flex items-center space-x-2">
                <TrendingUp className="text-primary w-4 h-4" />
                <span>Trending Threats</span>
              </h3>
              <div className="space-y-4">
                <TrendingItem label="OTP Verification Bypassing" count={12} danger />
                <TrendingItem label="Fake Job Recruitment" count={8} />
                <TrendingItem label="Typosquatted Banking URLs" count={5} danger />
                <TrendingItem label="Crypto 'Whale' Alerts" count={3} />
              </div>
            </div>

            <div className="glass rounded-[32px] p-6 border-white/5 bg-primary/5">
              <h3 className="font-display font-bold uppercase tracking-wider mb-2 text-primary">Contribute</h3>
              <p className="text-xs text-foreground/60 font-sans leading-relaxed mb-4">
                Found a new threat? Submit it for global analysis to protect millions of users. Anonymized by default.
              </p>
              <button className="w-full bg-primary text-background font-bold py-3 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 transition-all">Submit Threat</button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function TrendingItem({ label, count, danger = false }: any) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", danger ? "bg-red-400" : "bg-primary")} />
        <span className="text-xs text-foreground/40 group-hover:text-foreground/80 transition-colors truncate">{label}</span>
      </div>
      <span className="text-[10px] font-bold text-foreground/20">{count}x</span>
    </div>
  );
}
