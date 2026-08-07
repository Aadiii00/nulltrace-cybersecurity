"use client";

import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import ToolsSection from "@/components/ToolsSection";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ResultCard from "@/components/ResultCard";
import { ThreatAnalysis } from "@/types/threats";

export default function Home() {
  const [result, setResult] = useState<ThreatAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"message" | "url" | "file">("message");

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24">
        {/* Hero Section */}
        <HeroSection 
          onResult={setResult} 
          onLoading={setIsLoading} 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Result Section */}
        {(result || isLoading) && (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="mb-8 flex flex-col items-center text-center space-y-4">
              <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary">
                {isLoading ? "Analysis in Progress" : "Live Analysis Result"}
              </div>
              <h2 className="text-2xl font-display font-bold">
                {isLoading ? "Consulting Cyber Sentinel Brain..." : "Threat Intelligence Report"}
              </h2>
            </div>
            
            {isLoading ? (
              <div className="glass rounded-[40px] p-24 flex items-center justify-center">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-secondary/20 border-b-secondary rounded-full animate-spin [animation-duration:1s]" />
                  </div>
                </div>
              </div>
            ) : (
              result && <ResultCard data={result} />
            )}
          </div>
        )}

        {/* Tools Section */}
        <ToolsSection />

        {/* Call to Action Section */}
        <section className="py-32 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 cyber-grid -z-10" />
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight">
              Ready to Secure Your <span className="gradient-text">Digital Life?</span>
            </h2>
            <p className="text-foreground/60 text-lg font-sans">
              Join thousands of users who trust Nulltrace to filter out the noise and identify 
              threats before they strike.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button className="cyber-button text-background px-10 py-5 rounded-2xl font-bold font-display uppercase tracking-widest w-full sm:w-auto">
                Install Chrome Extension
              </button>
              <button className="glass neon-border px-10 py-5 rounded-2xl font-bold font-display uppercase tracking-widest hover:bg-white/10 transition-all w-full sm:w-auto neon-text">
                Explore API Docs
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
