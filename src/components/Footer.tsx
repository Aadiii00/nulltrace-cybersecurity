import { Shield, Globe, Share2, MessageSquare, Mail } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-20 px-6 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-primary fill-current" />
              <span className="text-2xl font-display font-bold tracking-tight font-mono">
                <span className="text-primary/60">[</span>Null<span className="text-primary">trace</span><span className="text-primary/60">]</span>
              </span>
            </div>
            <p className="text-foreground/40 font-sans leading-relaxed max-w-sm">
              Advanced cyber threat intelligence platform. Detect phishing, scams, and social engineering before they reach you.
            </p>
            <div className="flex items-center space-x-4">
              <SocialLink icon={<Globe className="w-5 h-5" />} href="#" />
              <SocialLink icon={<Share2 className="w-5 h-5" />} href="#" />
              <SocialLink icon={<MessageSquare className="w-5 h-5" />} href="#" />
              <SocialLink icon={<Mail className="w-5 h-5" />} href="#" />
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h4 className="font-display font-bold uppercase tracking-widest text-xs text-primary">Platform</h4>
            <ul className="space-y-4 text-sm font-medium text-foreground/60">
              <li><Link href="/tools" className="hover:text-primary transition-colors">Tools Marketplace</Link></li>
              <li><Link href="/analyze" className="hover:text-primary transition-colors">Real-time Scanner</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Global Insights</Link></li>
              <li><Link href="/api" className="hover:text-primary transition-colors">Enterprise API</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h4 className="font-display font-bold uppercase tracking-widest text-xs text-primary">Company</h4>
            <ul className="space-y-4 text-sm font-medium text-foreground/60">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Mission</Link></li>
              <li><Link href="/blog" className="hover:text-primary transition-colors">Security Blog</Link></li>
              <li><Link href="/career" className="hover:text-primary transition-colors">Join Elite Team</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Integrity Portal</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-6">
            <h4 className="font-display font-bold uppercase tracking-widest text-xs text-primary">Intelligence Feed</h4>
            <div className="glass rounded-2xl p-6 space-y-4 border-white/5">
              <p className="text-xs text-foreground/40 italic">"Nulltrace successfully neutralized 4.2k phishing attempts in the last 24 hours."</p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-bold uppercase text-green-400 bg-green-400/10 px-2 py-1 rounded">Live Status</span>
                <span className="text-[10px] font-medium text-foreground/20">Updated 2m ago</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/5 gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30">
          <p>© 2026 Nulltrace — Cyber Sentinel Intelligence. All Rights Reserved.</p>
          <div className="flex items-center space-x-8">
            <Link href="/privacy" className="hover:text-foreground/60 transition-colors">Privacy Shield</Link>
            <Link href="/terms" className="hover:text-foreground/60 transition-colors">Service Protocols</Link>
            <Link href="/security" className="hover:text-foreground/60 transition-colors">Security Audit</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ icon, href }: { icon: React.ReactNode; href: string }) {
  return (
    <a 
      href={href} 
      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground/40 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all"
    >
      {icon}
    </a>
  );
}
