"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  Shield, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  Globe, 
  MessageSquare, 
  FileText,
  TrendingUp,
  ShieldCheck,
  Search,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Mic,
  FileAudio
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Fix Navbar import if it's default export
// Check src/components/Navbar.tsx

export default function Dashboard() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Live Detections Carousel State
  const [carouselScans, setCarouselScans] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselFilters, setCarouselFilters] = useState({
    riskLevel: 'all',
    type: 'all',
    sortBy: 'newest'
  });
  const [carouselCursor, setCarouselCursor] = useState('');
  const [carouselHasMore, setCarouselHasMore] = useState(true);
  const [isCarouselLoading, setIsCarouselLoading] = useState(false);
  const [selectedForensicScan, setSelectedForensicScan] = useState<any | null>(null);

  const fetchCarouselData = async (reset = false) => {
    setIsCarouselLoading(true);
    try {
      const cursorToUse = reset ? '' : carouselCursor;
      const url = `/api/scan-results?cursor=${cursorToUse}&limit=10&riskLevel=${carouselFilters.riskLevel}&type=${carouselFilters.type}`;
      const res = await fetch(url);
      const data = await res.json();
      
      let sortedData = Array.isArray(data) ? data : [];
      if (carouselFilters.sortBy === 'highest risk') {
        const riskOrder: Record<string, number> = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1, 'safe': 0 };
        sortedData = [...sortedData].sort((a, b) => {
          const riskA = riskOrder[a.riskLevel.toLowerCase()] || 0;
          const riskB = riskOrder[b.riskLevel.toLowerCase()] || 0;
          if (riskB !== riskA) return riskB - riskA;
          return b.trustScore - a.trustScore;
        });
      }

      if (reset) {
        setCarouselScans(sortedData);
        setCurrentIndex(0);
      } else {
        setCarouselScans(prev => {
          // Filter duplicates
          const existingIds = new Set(prev.map(item => item.id));
          const filteredNew = sortedData.filter(item => !existingIds.has(item.id));
          return [...prev, ...filteredNew];
        });
      }

      if (data.length < 10) {
        setCarouselHasMore(false);
      } else {
        setCarouselHasMore(true);
        setCarouselCursor(data[data.length - 1].timestamp);
      }
    } catch (e) {
      console.error("Failed to fetch scan results:", e);
    } finally {
      setIsCarouselLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      try {
        const res = await fetch("/api/scans");
        const data = await res.json();
        setScans(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch scans", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Re-fetch carousel items when filters change
  useEffect(() => {
    if (user) {
      fetchCarouselData(true);
    }
  }, [user, carouselFilters.riskLevel, carouselFilters.type, carouselFilters.sortBy]);

  // Establish SSE connection for real-time scans
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connectSSE() {
      eventSource = new EventSource("/api/scan-results/stream");

      eventSource.onmessage = (event) => {
        try {
          const newScan = JSON.parse(event.data);
          
          const matchesRisk = carouselFilters.riskLevel === 'all' || 
                              newScan.riskLevel.toLowerCase() === carouselFilters.riskLevel.toLowerCase();
          const matchesType = carouselFilters.type === 'all' || 
                              newScan.type.toLowerCase() === carouselFilters.type.toLowerCase();

          if (matchesRisk && matchesType) {
            setCarouselScans(prev => {
              if (prev.some(item => item.id === newScan.id)) return prev;
              
              const updated = [newScan, ...prev];
              if (carouselFilters.sortBy === 'highest risk') {
                const riskOrder: Record<string, number> = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1, 'safe': 0 };
                return updated.sort((a, b) => {
                  const riskA = riskOrder[a.riskLevel.toLowerCase()] || 0;
                  const riskB = riskOrder[b.riskLevel.toLowerCase()] || 0;
                  if (riskB !== riskA) return riskB - riskA;
                  return b.trustScore - a.trustScore;
                });
              }
              return updated;
            });
            setCurrentIndex(0); // View new card instantly
          }
        } catch (e) {
          console.error("Error parsing live scan event:", e);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE stream disconnected, reconnecting in 5s...", err);
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    }

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user, carouselFilters]);

  const handleNext = () => {
    if (carouselScans.length === 0) return;
    if (currentIndex === carouselScans.length - 1) {
      if (carouselHasMore && !isCarouselLoading) {
        fetchCarouselData().then(() => {
          setCurrentIndex(prev => prev + 1);
        });
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [carouselScans, currentIndex, carouselHasMore, isCarouselLoading]);

  // Touch Swipe vars
  let touchStartX = 0;
  let touchEndX = 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX - touchEndX > 50) {
      handleNext();
    }
    if (touchEndX - touchStartX > 50) {
      setCurrentIndex(prev => Math.max(0, prev - 1));
    }
  };

  const getCarouselGlowClass = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'critical': return 'shadow-[0_0_60px_-15px_rgba(239,68,68,0.35)] border-red-500/20';
      case 'high': return 'shadow-[0_0_60px_-15px_rgba(249,115,22,0.35)] border-orange-500/20';
      case 'medium': return 'shadow-[0_0_60px_-15px_rgba(234,179,8,0.35)] border-yellow-500/20';
      default: return 'shadow-[0_0_60px_-15px_rgba(34,211,238,0.35)] border-cyan-500/20';
    }
  };

  const stats = {
    total: scans.length,
    critical: scans.filter(s => s.risk_level === "critical").length,
    high: scans.filter(s => s.risk_level === "high").length,
    safe: scans.filter(s => s.trust_score > 70).length,
  };

  const chartData = scans.slice(0, 10).reverse().map(s => ({
    name: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    score: s.trust_score,
  }));

  const typeData = [
    { name: 'Messages', value: scans.filter(s => s.type === 'message').length },
    { name: 'URLs', value: scans.filter(s => s.type === 'url').length },
    { name: 'Files', value: scans.filter(s => s.type === 'file').length },
  ];

  const COLORS = ['#00E5FF', '#7000FF', '#FF4B4B'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col">
        <Navbar />
        <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto space-y-12 w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-64 bg-white/5 rounded-xl" />
            <div className="h-4 w-96 bg-white/5 rounded-lg opacity-50" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 glass rounded-3xl animate-pulse bg-white/5 border border-white/5" />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 h-[400px] glass rounded-[32px] animate-pulse bg-white/5 border border-white/5" />
            <div className="lg:col-span-4 h-[400px] glass rounded-[32px] animate-pulse bg-white/5 border border-white/5" />
          </div>

          <div className="h-96 glass rounded-[32px] animate-pulse bg-white/5 border border-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-display font-bold">
              {user ? (
                <>Welcome back, <span className="text-primary">{user.email?.split('@')[0]}</span></>
              ) : (
                <>Cyber <span className="text-primary">Sentinel</span> HUD</>
              )}
            </h1>
            <p className="text-foreground/40 font-sans mt-2">
              {user ? "Your personal threat intelligence and ecosystem monitoring" : "Real-time threat intelligence and ecosystem monitoring"}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="glass px-4 py-2 rounded-xl border-white/5 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground/60">System Operational</span>
            </div>
            <button className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-all">Export Data</button>
          </div>
        </header>

        {/* Stats Grid */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <StatCard title="Total Scans" value={stats.total} icon={<Search className="text-primary" />} trend="+12%" />
          <StatCard title="Critical Nodes" value={stats.critical} icon={<AlertTriangle className="text-red-500" />} trend="+24%" danger />
          <StatCard title="High Risk" value={stats.high} icon={<Shield className="text-orange-500" />} trend="-5%" />
          <StatCard title="Neutralized" value={stats.safe} icon={<ShieldCheck className="text-secondary" />} trend="+8%" />
        </motion.div>

        {/* Forensic Engines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: AI Voice Detector */}
          <div className="glass rounded-[32px] p-8 border-white/5 relative overflow-hidden flex flex-col justify-between group shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-2xl -z-10 group-hover:scale-150 transition-transform duration-500" />
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-bold">🎤 AI Voice Detector</h3>
              </div>
              <p className="text-foreground/40 text-sm leading-relaxed mb-6">
                Detect AI-generated voices, cloned voices and spoofed recordings using deep learning. Identify deepfake audio attacks and digital voice cloning.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/voice-detector?tab=upload" className="bg-cyan-500 text-black px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-md shadow-cyan-500/10">
                Upload Audio
              </Link>
              <Link href="/voice-detector?tab=record" className="bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                Record Audio
              </Link>
            </div>
          </div>
          
          {/* Card 2: Voice Sentinel */}
          <div className="glass rounded-[32px] p-8 border-white/5 relative overflow-hidden flex flex-col justify-between group shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-2xl -z-10 group-hover:scale-150 transition-transform duration-500" />
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
                  <FileAudio className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-bold">🎙️ Voice Sentinel</h3>
              </div>
              <p className="text-foreground/40 text-sm leading-relaxed mb-6">
                Neural transcription engine for forensic audio analysis. Convert voice messages into verified intelligence and scan for social engineering threats.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/transcribe" className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md shadow-purple-500/10">
                Launch Sentinel
              </Link>
            </div>
          </div>

          {/* Card 3: Subdomain Discovery */}
          <div className="glass rounded-[32px] p-8 border-white/5 relative overflow-hidden flex flex-col justify-between group shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl -z-10 group-hover:scale-150 transition-transform duration-500" />
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                  <Globe className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-xl font-display font-bold">🌐 Subdomains</h3>
              </div>
              <p className="text-foreground/40 text-sm leading-relaxed mb-6">
                Discover public subdomains, track active services, response codes, and analyze overall external network exposures.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/subdomain-discovery" className="bg-primary text-black px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary/80 transition-all shadow-md shadow-primary/10">
                Launch Discovery
              </Link>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Trend Chart */}
          <div className="lg:col-span-8 glass rounded-[32px] p-8 border-white/5 min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <TrendingUp className="text-primary w-5 h-5" />
                <h3 className="font-display font-bold uppercase tracking-wider">Threat Delta (Trust Scores)</h3>
              </div>
              <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs outline-none">
                <option>Last 24 Hours</option>
                <option>Last 7 Days</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161a23', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#00E5FF' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#00E5FF" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="lg:col-span-4 glass rounded-[32px] p-8 border-white/5">
            <div className="flex items-center space-x-3 mb-8">
              <BarChart3 className="text-secondary w-5 h-5" />
              <h3 className="font-display font-bold uppercase tracking-wider">Vector Distro</h3>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161a23', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {typeData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-foreground/60">{item.name}</span>
                  </div>
                  <span className="font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Detections Carousel */}
        <div className="glass rounded-[32px] p-8 border-white/5 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div className="flex items-center space-x-3">
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping absolute" />
                <div className="w-3 h-3 rounded-full bg-cyan-400 relative" />
              </div>
              <div>
                <h3 className="font-display font-bold uppercase tracking-wider text-sm">Live Operative Feed</h3>
                <p className="text-[10px] text-foreground/40 font-mono mt-0.5">Real-time threat logs from active extension clients</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={carouselFilters.type}
                onChange={(e) => setCarouselFilters(prev => ({ ...prev, type: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary/50 text-foreground"
              >
                <option value="all">All Channels</option>
                <option value="url">URLs/Links</option>
                <option value="selection">Selection scans</option>
                <option value="whatsapp">WhatsApp messages</option>
                <option value="gmail">Gmail emails</option>
                <option value="generic">Generic sites</option>
              </select>

              <select 
                value={carouselFilters.riskLevel}
                onChange={(e) => setCarouselFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary/50 text-foreground"
              >
                <option value="all">All Risks</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low/Safe</option>
              </select>

              <select 
                value={carouselFilters.sortBy}
                onChange={(e) => setCarouselFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary/50 text-foreground"
              >
                <option value="newest">Newest First</option>
                <option value="highest risk">Highest Risk</option>
              </select>
            </div>
          </div>

          {carouselScans.length > 0 ? (
            <div className="relative flex flex-col items-center">
              {/* Carousel card container with dynamic threat color boundary glows */}
              <div className={cn(
                "relative overflow-hidden w-full max-w-2xl rounded-[32px] border bg-black/45 backdrop-blur-md transition-all duration-[350ms]",
                getCarouselGlowClass(carouselScans[currentIndex]?.riskLevel)
              )}>
                <div 
                  className="flex w-full transition-transform duration-[300ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
                  style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {carouselScans.map((scan) => (
                    <div 
                      key={scan.id} 
                      className="w-full flex-shrink-0 p-8 flex flex-col md:flex-row gap-8 items-center justify-between"
                      style={{ width: '100%' }}
                    >
                      {/* Left: circular score gauge */}
                      <div className="flex flex-col items-center justify-center space-y-4 flex-shrink-0">
                        <div className="relative w-36 h-36 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90 transform">
                            <circle
                              cx="72"
                              cy="72"
                              r="64"
                              fill="none"
                              stroke="rgba(255,255,255,0.03)"
                              strokeWidth="8"
                            />
                            <motion.circle
                              cx="72"
                              cy="72"
                              r="64"
                              fill="none"
                              stroke={
                                scan.trustScore > 70 ? '#00E5FF' : scan.trustScore > 30 ? '#7000FF' : '#FF4B4B'
                              }
                              strokeWidth="8"
                              strokeDasharray="402.12"
                              initial={{ strokeDashoffset: 402.12 }}
                              animate={{ strokeDashoffset: 402.12 - (scan.trustScore / 100) * 402.12 }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-display font-bold leading-none">{scan.trustScore}</span>
                            <span className="text-[9px] uppercase tracking-widest text-foreground/40 font-bold mt-1">Trust Quotient</span>
                          </div>
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-bold uppercase border",
                          scan.riskLevel === 'critical' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                          scan.riskLevel === 'high' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
                          scan.riskLevel === 'medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                          'text-green-400 bg-green-400/10 border-green-400/20'
                        )}>
                          {scan.riskLevel} Risk
                        </span>
                      </div>

                      {/* Right: metadata details */}
                      <div className="flex-1 w-full space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-cyan-400 font-bold flex items-center space-x-1.5">
                            {scan.type === 'url' && <Globe className="w-3.5 h-3.5" />}
                            {(scan.type === 'selection' || scan.type === 'message') && <MessageSquare className="w-3.5 h-3.5" />}
                            {scan.type === 'whatsapp' && <MessageSquare className="w-3.5 h-3.5 text-green-400" />}
                            {scan.type === 'gmail' && <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />}
                            {scan.type === 'generic' && <FileText className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{scan.type} Scan</span>
                          </span>
                          <span className="text-[10px] text-foreground/35 font-mono">
                            {new Date(scan.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl max-h-24 overflow-y-auto">
                          <span className="text-[8px] uppercase tracking-wider font-bold text-foreground/30 block mb-1">Target Content</span>
                          <p className="text-xs font-mono text-foreground/80 break-all select-all font-semibold italic">
                            "{scan.target}"
                          </p>
                        </div>

                        {scan.pageUrl && (
                          <div className="text-[10px] text-foreground/40 break-all flex items-baseline space-x-1">
                            <span className="font-semibold text-foreground/30 flex-shrink-0">Found on:</span>
                            <a href={scan.pageUrl} target="_blank" className="text-cyan-400/70 hover:text-cyan-400 hover:underline inline-block break-all font-semibold">
                              {scan.pageUrl}
                            </a>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-foreground/30 block">Forensic Analysis</span>
                          <p className="text-xs text-foreground/70 line-clamp-2">
                            {scan.explanation}
                          </p>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-white/5">
                          <span className="text-[10px] text-foreground/40 font-semibold italic">
                            Classification: <span className="text-cyan-400 font-bold uppercase tracking-wider font-mono text-[9px] ml-1">{scan.category}</span>
                          </span>
                          <button 
                            onClick={() => setSelectedForensicScan(scan)}
                            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline uppercase tracking-widest font-display text-[10px]"
                          >
                            Full Forensic View →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chevrons and Position Index */}
              <div className="flex items-center justify-center space-x-6 mt-6">
                <button 
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-xs font-mono font-bold tracking-widest text-foreground/40 min-w-16 text-center">
                  {currentIndex + 1} / {carouselScans.length}
                </span>

                <button 
                  onClick={handleNext}
                  disabled={carouselScans.length === 0 || (currentIndex === carouselScans.length - 1 && !carouselHasMore)}
                  className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="h-60 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-foreground/30 text-sm space-y-2">
              <Shield className="w-8 h-8 text-foreground/20 animate-pulse" />
              <p className="italic">Awaiting live threat scans from the Sentinel extension client...</p>
            </div>
          )}
        </div>

        {/* Full Forensic Modal */}
        {selectedForensicScan && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedForensicScan(null)} />
            <div className="w-full max-w-xl glass rounded-[40px] p-8 md:p-10 border-white/10 relative z-10 shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
              <button 
                onClick={() => setSelectedForensicScan(null)}
                className="absolute top-6 right-6 p-2 text-foreground/20 hover:text-foreground hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3 mb-6">
                <Shield className="w-7 h-7 text-primary" />
                <h2 className="text-2xl font-display font-bold uppercase tracking-tight">Full Forensic Report</h2>
              </div>
              
              <div className="space-y-6 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-foreground/40 block">Threat Vector</span>
                    <span className="text-xs font-semibold capitalize flex items-center space-x-2 mt-1">
                      {selectedForensicScan.type === 'url' && <Globe className="w-4 h-4 text-secondary" />}
                      {(selectedForensicScan.type === 'selection' || selectedForensicScan.type === 'message') && <MessageSquare className="w-4 h-4 text-primary" />}
                      {selectedForensicScan.type === 'whatsapp' && <MessageSquare className="w-4 h-4 text-green-400" />}
                      {selectedForensicScan.type === 'gmail' && <MessageSquare className="w-4 h-4 text-yellow-400" />}
                      {selectedForensicScan.type === 'generic' && <FileText className="w-4 h-4 text-slate-400" />}
                      <span>{selectedForensicScan.type}</span>
                    </span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-foreground/40 block">Risk Level</span>
                    <span className={cn(
                      "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border mt-1.5",
                      selectedForensicScan.riskLevel === 'critical' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                      selectedForensicScan.riskLevel === 'high' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
                      selectedForensicScan.riskLevel === 'medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                      'text-green-400 bg-green-400/10 border-green-400/20'
                    )}>
                      {selectedForensicScan.riskLevel}
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-foreground/40 block">Scanned Target</span>
                  <p className="font-mono text-xs text-foreground/80 break-all select-all font-semibold bg-black/30 p-3 rounded-xl border border-white/5">
                    {selectedForensicScan.target}
                  </p>
                </div>

                {selectedForensicScan.pageUrl && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-foreground/40 block">Source Page</span>
                    <a 
                      href={selectedForensicScan.pageUrl} 
                      target="_blank" 
                      className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline break-all mt-1 block font-semibold"
                    >
                      {selectedForensicScan.pageUrl}
                    </a>
                  </div>
                )}

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-foreground/40 block">Trust Quotient</span>
                  <div className="flex items-center space-x-3 mt-2">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ 
                          width: `${selectedForensicScan.trustScore}%`, 
                          backgroundColor: selectedForensicScan.trustScore > 70 ? '#00E5FF' : selectedForensicScan.trustScore > 30 ? '#7000FF' : '#FF4B4B' 
                        }} 
                      />
                    </div>
                    <span className="font-bold text-lg">{selectedForensicScan.trustScore}%</span>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-foreground/40 block">Detailed Explanation</span>
                  <p className="text-foreground/80 leading-relaxed text-xs mt-2">
                    {selectedForensicScan.explanation || "No explanation provided."}
                  </p>
                </div>

                {selectedForensicScan.reasons && selectedForensicScan.reasons.length > 0 && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-foreground/40 block mb-2">Threat Indicators</span>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-foreground/80">
                      {selectedForensicScan.reasons.map((reason: string, i: number) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scan History Table */}
        <div className="glass rounded-[32px] overflow-hidden border-white/5">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-display font-bold uppercase tracking-wider">Historical Logs</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <input 
                type="text" 
                placeholder="Search logs..." 
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-primary/50 transition-all w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 border-b border-white/5">
                  <th className="px-8 py-4">Threat Vector</th>
                  <th className="px-8 py-4">Trust Score</th>
                  <th className="px-8 py-4">Risk Level</th>
                  <th className="px-8 py-4">Analysis Snippet</th>
                  <th className="px-8 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="text-sm font-sans divide-y divide-white/[0.02]">
                {scans.length > 0 ? scans.slice(0, 10).map((scan, idx) => (
                  <motion.tr 
                    key={scan.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-6 capitalize font-medium flex items-center space-x-3">
                      {scan.type === 'message' && <MessageSquare className="w-4 h-4 text-primary" />}
                      {scan.type === 'url' && <Globe className="w-4 h-4 text-secondary" />}
                      {scan.type === 'file' && <FileText className="w-4 h-4 text-foreground/40" />}
                      <span>{scan.type}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${scan.trust_score}%`, backgroundColor: scan.trust_score > 70 ? '#00E5FF' : scan.trust_score > 30 ? '#7000FF' : '#FF4B4B' }} 
                          />
                        </div>
                        <span className="font-bold font-display">{scan.trust_score}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase border",
                        scan.risk_level === 'critical' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                        scan.risk_level === 'high' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
                        'text-green-400 bg-green-400/10 border-green-400/20'
                      )}>
                        {scan.risk_level}
                      </span>
                    </td>
                    <td className="px-8 py-6 max-w-md">
                      <p className="text-foreground/40 line-clamp-1 italic text-xs">"{scan.analysis}"</p>
                    </td>
                    <td className="px-8 py-6 text-xs text-foreground/20 font-sans">
                      {new Date(scan.created_at).toLocaleString()}
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-foreground/20 italic">No logs detected in current cycle.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function StatCard({ title, value, icon, trend, danger = false }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass rounded-3xl p-6 border-white/5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <div className={cn("text-[10px] font-bold px-2 py-1 rounded", danger ? "text-red-400 bg-red-400/10" : "text-green-400 bg-green-400/10")}>
          {trend}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/40">{title}</h4>
        <p className="text-3xl font-display font-bold mt-1">{value}</p>
      </div>
    </motion.div>
  );
}

