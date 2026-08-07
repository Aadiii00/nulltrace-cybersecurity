"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Mail, ArrowRight, Loader2, Bot, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [isRegistering, setIsRegistering] = useState(initialMode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        alert("Check your email for the verification link!");
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.refresh(); // Refresh to update user state in layout/navbar
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-[450px] glass rounded-[40px] p-8 md:p-12 border-white/5 relative z-10 shadow-2xl overflow-hidden"
          >
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px]" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-[60px]" />

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-foreground/20 hover:text-foreground transition-colors hover:bg-white/5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4 mb-10">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20">
                <Shield className="w-8 h-8 text-background" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold uppercase tracking-tight">
                  {isRegistering ? "Initialize Protocol" : "Security Checkpoint"}
                </h1>
                <p className="text-foreground/40 text-sm font-sans mt-2">
                  {isRegistering 
                    ? "Create your digital defense profile." 
                    : "Access your global threat intelligence dashboard."}
                </p>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    placeholder="Neural Mail Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-sans text-sm"
                    required
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-secondary transition-colors" />
                  <input
                    type="password"
                    placeholder="Encrypted Access Key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-secondary/50 transition-all font-sans text-sm"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-[10px] font-bold uppercase tracking-widest text-center"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-background font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 hover:brightness-110 active:scale-[0.98] transition-all group overflow-hidden relative"
              >
                <span className="relative z-10 uppercase tracking-widest">
                  {loading ? "Decrypting..." : isRegistering ? "Activate Link" : "Grant Access"}
                </span>
                {!loading && <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />}
                {loading && <Loader2 className="w-5 h-5 animate-spin relative z-10" />}
              </button>
            </form>

            <div className="mt-8 text-center text-xs font-sans">
              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-foreground/40 hover:text-primary transition-colors uppercase tracking-widest font-bold"
              >
                {isRegistering ? "Already clear? Sign In" : "New operative? Register Here"}
              </button>
            </div>

            <div className="mt-12 flex items-center justify-center space-x-2 text-[10px] text-foreground/10 uppercase tracking-[0.2em] font-bold">
              <Bot className="w-3 h-3" />
              <span>Encrypted via Sentinel-X Protocol</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
