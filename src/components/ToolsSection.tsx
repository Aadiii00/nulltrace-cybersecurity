"use client";

import { 
  ShieldAlert, 
  Globe2, 
  Briefcase, 
  Mail, 
  Camera, 
  KeyRound, 
  Users,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

import { TOOLS } from "@/lib/constants";
import Link from "next/link";

export default function ToolsSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden" id="tools">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              The Intelligence <span className="gradient-text">Tool Suite</span>
            </h2>
            <p className="text-foreground/60 max-w-xl font-sans">
              Explore our specialized engines designed to tackle every digital threat vector. 
              From deep link inspection to behavioral intent analysis.
            </p>
          </div>
          <button className="flex items-center space-x-2 text-primary font-bold hover:translate-x-1 transition-transform font-display text-sm uppercase tracking-widest neon-text hover:neon-border px-3 py-1 rounded">
            <span>View All Intelligence Tools</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TOOLS.map((tool, index) => (
            <Link href={`/tools/${tool.id}`} key={tool.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass p-8 rounded-[32px] group cursor-pointer relative overflow-hidden flex flex-col h-full neon-border scan-line"
              >
                {/* Tool Background Glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${tool.gradient} blur-2xl -z-10 group-hover:scale-150 transition-transform duration-500`} />
                
                <div className="mb-6 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors text-primary neon-border">
                  <tool.icon className="w-6 h-6 neon-text" />
                </div>
                
                <h3 className="text-xl font-display font-bold mb-3 group-hover:text-primary transition-colors neon-text">
                  {tool.title}
                </h3>
                <p className="text-foreground/40 text-sm leading-relaxed mb-6 font-sans flex-grow">
                  {tool.description}
                </p>
                
                <div className="flex items-center space-x-2 text-primary/40 group-hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest neon-text">
                  <span>Launch Engine</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.div>
            </Link>
          ))}
          
          {/* Marketplace Teaser Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: TOOLS.length * 0.1 }}
            className="p-8 rounded-[32px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/30 transition-colors neon-border"
          >
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center neon-border">
              <span className="text-xl font-display text-primary neon-text">+</span>
            </div>
            <p className="text-foreground/30 text-xs font-display uppercase tracking-wider neon-text">New Engines Coming Soon</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
