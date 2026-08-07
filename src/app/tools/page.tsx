"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TOOLS, type ToolId } from "@/lib/constants";
import Link from "next/link";
import { ShieldAlert, Globe2, Briefcase, Mail, Camera, KeyRound, Users, ArrowRight, Search } from "lucide-react";
import DeepfakeDetector from "@/components/DeepfakeDetector";

export default function ToolsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTools = TOOLS.filter(tool =>
    tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24">
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl font-display font-bold">
              Cybersecurity Tools
            </h1>
            <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
              Comprehensive suite of AI-powered tools to protect against digital threats.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-low/30 border border-white/10 rounded-xl focus:border-primary/50 focus:outline-none transition-all"
              />
            </div>
          </div>
        </section>
        
        {/* All Tools Grid */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => (
                <Link href={`/tools/${tool.id}`} key={tool.id}>
                  <div className="glass p-6 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group">
                    <div className="mb-4 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <tool.icon className="w-6 h-6" />
                    </div>
                    
                    <h3 className="text-xl font-display font-bold mb-3 group-hover:text-primary transition-colors">
                      {tool.title}
                    </h3>
                    
                    <p className="text-foreground/40 text-sm leading-relaxed mb-4">
                      {tool.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-primary/60 font-mono uppercase">
                        {tool.tab === "message" ? "Text Analysis" : 
                         tool.tab === "url" ? "URL Scanner" : "File Upload"}
                      </span>
                      
                      <ArrowRight className="w-4 h-4 text-primary/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {filteredTools.length === 0 && (
              <div className="text-center py-12">
                <p className="text-foreground/40">No tools found matching "{searchTerm}"</p>
              </div>
            )}
          </div>
        </section>

        {/* Deepfake Detector Section */}
        <div className="border-t border-white/5">
          <DeepfakeDetector />
        </div>
      </main>

      <Footer />
    </div>
  );
}
