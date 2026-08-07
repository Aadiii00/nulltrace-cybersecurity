"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Zap, LayoutDashboard, Search, Menu, X, Mic, Globe, ChevronDown } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto glass rounded-2xl px-6 py-3 flex items-center justify-between neon-border relative overflow-hidden">
        {/* Animated Glow Line */}
        <motion.div 
          className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent w-full"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center neon-border group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-primary fill-current" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight font-mono">
              <span className="text-primary/60">[</span>Null<span className="text-primary neon-text">trace</span><span className="text-primary/60">]</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center lg:space-x-3 xl:space-x-5 text-[11px] xl:text-xs font-bold text-foreground/60">
            <Link href="/tools" className="hover:text-primary transition-colors neon-text hover:neon-border px-2 py-1 rounded">Tools</Link>
            <Link href="/dashboard" className="hover:text-primary transition-colors flex items-center space-x-1 hover:neon-border px-2 py-1 rounded">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <Link href="/community" className="hover:text-primary transition-colors neon-text hover:neon-border px-2 py-1 rounded">Community Feed</Link>
            <Link href="/transcribe" className="hover:text-primary transition-colors flex items-center space-x-1 hover:neon-border px-2 py-1 rounded">
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Sentinel</span>
            </Link>
            <Link href="/voice-detector" className="hover:text-primary transition-colors flex items-center space-x-1 hover:neon-border px-2 py-1 rounded">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Voice Detector</span>
            </Link>
            <Link href="/network-scan" className="hover:text-primary transition-colors flex items-center space-x-1 hover:neon-border px-2 py-1 rounded">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Net Intel</span>
            </Link>
            <Link href="/subdomain-discovery" className="hover:text-primary transition-colors flex items-center space-x-1 hover:neon-border px-2 py-1 rounded">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>Subdomains</span>
            </Link>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <button className="p-2 text-foreground/40 hover:text-primary transition-colors leading-none">
            <Search className="w-5 h-5" />
          </button>
          
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Level 4 Operative</span>
                <span className="text-xs font-medium truncate max-w-[120px]">{user.email?.split('@')[0]}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => {
                setAuthMode("login");
                setIsAuthModalOpen(true);
              }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              Sign In
            </button>
          )}

          <Link 
            href="/" 
            className="cyber-button text-background px-6 py-2 rounded-xl text-sm font-bold flex items-center space-x-2"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Launch Scanner</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-foreground/60"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden mt-2 glass rounded-2xl p-6 space-y-4 neon-border"
        >
          <Link href="/tools" className="block text-lg font-medium">Tools Suite</Link>
          <Link href="/dashboard" className="block text-lg font-medium">Analytics Dashboard</Link>
          <Link href="/community" className="block text-lg font-medium">Threat Feed</Link>
          <Link href="/transcribe" className="block text-lg font-medium">🎙️ Voice Sentinel</Link>
          <Link href="/voice-detector" className="block text-lg font-medium">🎤 AI Voice Detector</Link>
          <Link href="/subdomain-discovery" className="block text-lg font-medium">🌐 Subdomains</Link>
          <hr className="border-white/5" />
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => {
                setAuthMode("login");
                setIsAuthModalOpen(true);
              }}
              className="bg-white/5 p-3 rounded-xl font-bold"
            >
              Sign In
            </button>
            <button 
              onClick={() => {
                setAuthMode("signup");
                setIsAuthModalOpen(true);
              }}
              className="bg-primary text-background p-3 rounded-xl font-bold"
            >
              Get Started
            </button>
          </div>
        </motion.div>
      )}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode}
      />
    </nav>
  );
}
