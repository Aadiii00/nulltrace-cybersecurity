"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  Globe, 
  Search, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  WifiOff, 
  ExternalLink 
} from "lucide-react";
import { motion } from "framer-motion";

interface Subdomain {
  host: string;
  status: string;
  https: boolean;
  response: number | null;
  risk: string;
}

interface ScanResponse {
  domain: string;
  totalSubdomains: number;
  liveSubdomains: number;
  deadSubdomains: number;
  subdomains: Subdomain[];
}

export default function SubdomainDiscovery() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setCurrentPage(1);

    try {
      const res = await fetch("/api/subdomains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: domain.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to scan subdomains. Make sure Python backend is running.");
      }

      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJSON = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subdomains-${results.domain}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!results) return;
    const headers = "Subdomain,Status,HTTPS,Response Code,Risk Level\n";
    const rows = results.subdomains.map(sub => 
      `"${sub.host}","${sub.status}",${sub.https},${sub.response || "N/A"},"${sub.risk}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subdomains-${results.domain}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get AI recommendations
  const getAIRecommendation = () => {
    if (!results) return "";
    const highRiskCount = results.subdomains.filter(s => s.risk === "High" && s.status === "Live").length;
    
    if (highRiskCount > 0) {
      return "CRITICAL: The target exposes administrative interfaces or unsecured HTTP ports. It is highly recommended to block public external access to admin endpoints and enforce HTTPS redirection immediately.";
    }
    return "SAFE: The identified subdomains show normal risk levels and secure SSL configuration. Continue regular periodic attack surface audits.";
  };

  // Filter & Search Logic
  const filteredSubdomains = results ? results.subdomains.filter(sub => {
    const matchesSearch = sub.host.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "live" && sub.status === "Live") ||
      (filterStatus === "inactive" && sub.status === "Inactive");
    const matchesRisk = filterRisk === "all" || sub.risk.toLowerCase() === filterRisk.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesRisk;
  }) : [];

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSubdomains.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSubdomains.length / itemsPerPage);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 pt-28 pb-16 px-6 max-w-7xl mx-auto w-full space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Globe className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-display font-bold uppercase tracking-wider">Subdomain Discovery</h1>
          </div>
          <p className="text-foreground/40 max-w-2xl">
            Enumerate public DNS subdomains, map target attack surface, and identify potential exposures like hidden development environments, unsecured admin endpoints, and inactive service configurations.
          </p>
        </header>

        {/* Scan Input Box */}
        <section className="glass rounded-[32px] p-8 border-white/5 relative overflow-hidden shadow-xl">
          <form onSubmit={handleScan} className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground/30 w-5 h-5" />
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Enter domain (e.g. google.com, github.com)"
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-primary/50 focus:outline-none transition-all text-sm font-mono"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="w-full md:w-auto px-8 py-4 bg-primary text-black font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Discovery...
                </>
              ) : (
                "Scan Subdomains"
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-mono">
              Error: {error}
            </div>
          )}
        </section>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-foreground/40 text-sm font-mono uppercase tracking-widest">Enumerate Certificates & Checking Live Hosts...</p>
          </div>
        )}

        {/* Results Overview */}
        {results && !loading && (
          <div className="space-y-8">
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass rounded-2xl p-6 border-white/5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Total Identified</p>
                    <h3 className="text-3xl font-display font-bold mt-2">{results.totalSubdomains}</h3>
                  </div>
                  <Globe className="text-primary w-5 h-5" />
                </div>
              </div>

              <div className="glass rounded-2xl p-6 border-white/5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Live Hosts</p>
                    <h3 className="text-3xl font-display font-bold mt-2 text-green-400">{results.liveSubdomains}</h3>
                  </div>
                  <Activity className="text-green-400 w-5 h-5" />
                </div>
              </div>

              <div className="glass rounded-2xl p-6 border-white/5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Inactive Hosts</p>
                    <h3 className="text-3xl font-display font-bold mt-2 text-foreground/30">{results.deadSubdomains}</h3>
                  </div>
                  <WifiOff className="text-foreground/30 w-5 h-5" />
                </div>
              </div>

              <div className="glass rounded-2xl p-6 border-white/5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">High Risk Targets</p>
                    <h3 className="text-3xl font-display font-bold mt-2 text-red-500">
                      {results.subdomains.filter(s => s.risk === "High" && s.status === "Live").length}
                    </h3>
                  </div>
                  <ShieldAlert className="text-red-500 w-5 h-5" />
                </div>
              </div>
            </div>

            {/* AI Summary Recommendation Box */}
            <div className="glass rounded-[24px] p-6 border-white/5 bg-white/[0.01] flex flex-col md:flex-row gap-6 items-start">
              <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-display font-bold text-sm uppercase tracking-wider text-primary">Attack Surface Insight & Recommendations</h4>
                <p className="text-sm text-foreground/60 leading-relaxed font-mono">
                  {getAIRecommendation()}
                </p>
              </div>
            </div>

            {/* Control Bar for Table */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  placeholder="Filter by subdomain..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-primary/50 focus:outline-none text-xs w-48 font-mono"
                />

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary/50 text-foreground"
                >
                  <option value="all">All Status</option>
                  <option value="live">Live</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary/50 text-foreground"
                >
                  <option value="all">All Risks</option>
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
              </div>

              {/* Export Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy JSON
                </button>
                <button
                  onClick={downloadJSON}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </button>
                <button
                  onClick={downloadCSV}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="glass rounded-[24px] border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-bold uppercase tracking-widest text-foreground/45">
                      <th className="p-4 pl-6">Subdomain</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">HTTPS</th>
                      <th className="p-4">Response</th>
                      <th className="p-4">Risk Level</th>
                      <th className="p-4 pr-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((sub, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.01] transition-all text-xs font-mono">
                        <td className="p-4 pl-6 font-bold">{sub.host}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            sub.status === "Live" ? "bg-green-400/10 text-green-400" : "bg-white/5 text-foreground/30"
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-4">{sub.https ? "Yes 🔒" : "No ⚠️"}</td>
                        <td className="p-4">{sub.response || "—"}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            sub.risk === "High" ? "bg-red-500/10 text-red-500" : 
                            sub.risk === "Medium" ? "bg-yellow-500/10 text-yellow-500" : 
                            "bg-green-500/10 text-green-500"
                          }`}>
                            {sub.risk}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <a
                            href={`${sub.https ? "https://" : "http://"}${sub.host}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-[10px] uppercase font-bold"
                          >
                            Visit
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                    {currentItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-foreground/30">
                          No subdomains match the applied filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-foreground/40 font-mono">
                    Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredSubdomains.length)} of {filteredSubdomains.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-[10px] font-mono uppercase font-bold transition-all"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-[10px] font-mono uppercase font-bold transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
