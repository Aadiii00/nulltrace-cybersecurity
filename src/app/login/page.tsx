"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Lock, Mail, ArrowRight, Loader2, Bot } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-6 pt-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[450px] glass rounded-[40px] p-8 md:p-12 border-white/5 relative z-10"
        >
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
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-xs font-bold uppercase tracking-widest text-center"
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
      </main>

      <Footer />
    </div>
  );
}
