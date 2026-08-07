"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
  User as UserIcon
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

