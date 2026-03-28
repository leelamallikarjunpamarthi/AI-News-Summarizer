"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { 
  FileText, 
  TrendingUp, 
  Users, 
  Activity,
  ArrowUpRight,
  Plus,
  Search,
  ExternalLink,
  Clock,
  ChevronRight,
  CheckCircle2,
  X,
  Trash2,
  RefreshCw
} from "lucide-react";
import StatCard from "@/components/StatCard";
import ChartWidget from "@/components/ChartWidget";
import Link from "next/link";

const stats: { title: string; value: string; change: string; icon: any; trend: "up" | "down" | "neutral" }[] = [
  { title: "Total Articles", value: "1,284", change: "+12%", icon: FileText, trend: "up" },
  { title: "Avg. Impact Score", value: "8.4", change: "+2.1", icon: TrendingUp, trend: "up" },
  { title: "Active Readers", value: "42.5k", change: "+5.4%", icon: Users, trend: "up" },
  { title: "Live Pulse", value: "High", change: "Active", icon: Activity, trend: "neutral" },
];

export default function Dashboard() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";
  const [userProfile, setUserProfile] = useState("general");
  const [activeTab, setActiveTab] = useState("overview");

  const [documents, setDocuments] = useState<{document_id: string, filename: string}[]>([]);
  const [allInsights, setAllInsights] = useState<{id: string, title: string, summary: string, date: string, entities: string[]}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevDocCountRef = useRef<number>(0);

  const fetchDocs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const [docsRes, insightsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/documents`, { cache: "no-store" }),
        fetch(`${apiUrl}/api/v1/insights`, { cache: "no-store" })
      ]);
      
      const docsData = await docsRes.json();
      const insightsData = await insightsRes.json();
      
      if (docsData.documents) {
        setDocuments(docsData.documents);
        prevDocCountRef.current = docsData.documents.length;
      }
      if (insightsData.insights) setAllInsights(insightsData.insights);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDocs(false);
  }, [fetchDocs]);

  // Poll every 8 seconds to pick up background-processed uploads
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      fetchDocs(true);
    }, 8000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchDocs]);

  // Re-fetch when page becomes visible again (user switched tabs or navigated back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDocs(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchDocs]);

  const fetchAnalysis = async (docId: string) => {
    setAnalyzingDocId(docId);
    try {
      const res = await fetch("http://localhost:8000/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId, user_profile: userProfile }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedDoc(data);
        setActiveTab("news");
      }
    } catch (err) {
      console.error("Failed to fetch analysis", err);
    } finally {
      setAnalyzingDocId(null);
    }
  };

  const deleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/documents/${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.document_id !== docId));
        if (selectedDoc?.document_id === docId) {
          setSelectedDoc(null);
          setActiveTab("overview");
        }
      }
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  };

  const filteredInsights = useMemo(() => {
    if (!searchQuery) return allInsights;
    return allInsights.filter(insight => 
      insight.title.toLowerCase().includes(searchQuery) || 
      insight.summary.toLowerCase().includes(searchQuery) ||
      insight.entities?.some(e => e.toLowerCase().includes(searchQuery))
    );
  }, [searchQuery, allInsights]);

  const [subTab, setSubTab] = useState("summary");
  const [translatedContent, setTranslatedContent] = useState<any>(null);
  const [translating, setTranslating] = useState(false);

  const translate = async (lang: string) => {
    setTranslating(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: selectedDoc.summary + "\n\n" + selectedDoc.key_facts.join("\n"), 
          target_language: lang 
        }),
      });
      if (res.ok) {
        setTranslatedContent(await res.json());
      }
    } catch (err) {
      console.error("Translation failed", err);
    } finally {
      setTranslating(false);
    }
  };

  const [selectedForBriefing, setSelectedForBriefing] = useState<string[]>([]);
  const [briefingResult, setBriefingResult] = useState<any>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);

  const generateBriefing = async () => {
    setGeneratingBriefing(true);
    setIsBriefingOpen(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          document_ids: selectedForBriefing, 
          user_profile: userProfile 
        }),
      });
      if (res.ok) {
        setBriefingResult(await res.json());
      }
    } catch (err) {
      console.error("Briefing failed", err);
    } finally {
      setGeneratingBriefing(false);
    }
  };

  const toggleBriefingSelect = (id: string) => {
    setSelectedForBriefing(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-foreground"
          >
            My ET: <span className="text-accent">Personalized Newsroom</span>
          </motion.h2>
          <p className="text-zinc-500 mt-1">
             AI-Native Business Intelligence for <span className="text-accent font-semibold capitalize">{userProfile}s</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Profile Selector */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-4">
            {["general", "investor", "founder", "student"].map((p) => (
              <button
                key={p}
                onClick={() => setUserProfile(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${userProfile === p ? "bg-accent/20 text-accent border border-accent/30" : "text-zinc-500 hover:text-white"}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => { setActiveTab("overview"); setSelectedDoc(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "overview" ? "bg-accent text-foreground shadow-accent" : "text-zinc-400 hover:text-white"}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab("news")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "news" ? "bg-accent text-foreground shadow-accent" : "text-zinc-400 hover:text-white"}`}
            >
              AI News
            </button>
          </div>
          <Link href="/upload">
            <button className="glass-button flex items-center gap-2 group">
              <Plus className="w-5 h-5 text-accent group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-semibold text-foreground">New Analysis</span>
            </button>
          </Link>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" ? (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Stats Grid */}
            {!searchQuery && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                  <StatCard 
                    key={stat.title} 
                    {...stat} 
                    value={stat.title === "Total Articles" ? documents.length.toString() : stat.value}
                    change={stat.title === "Total Articles" ? (documents.length > 0 ? "+100%" : "0%") : stat.change}
                  />
                ))}
              </div>
            )}

            {/* Main Content Areas */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Left: Trending Chart & Documents */}
              {!searchQuery && (
                <div className="xl:col-span-2 space-y-8">
                  <div className="glass-card p-6 min-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-foreground">Engagement Trends</h3>
                      <button className="text-sm text-accent hover:opacity-80 flex items-center gap-1 transition-colors">
                        Weekly View <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="h-[300px] mt-auto relative">
                      <ChartWidget />
                      {documents.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px] rounded-xl">
                          <p className="text-xs text-zinc-500 font-medium">No data points yet. Upload files to see trends.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* My Documents Section */}
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-foreground">My Documents</h3>
                        {refreshing && (
                          <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
                        )}
                        {documents.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">
                            {documents.length} stored
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => fetchDocs(false)} 
                          title="Refresh documents"
                          className="text-xs text-zinc-500 hover:text-accent flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Refresh
                        </button>
                        <Link href="/upload" className="text-xs text-accent hover:underline flex items-center gap-1">
                           Upload More <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {loading ? (
                        <div className="col-span-2 py-8 text-center text-zinc-500">Loading documents...</div>
                      ) : documents.length > 0 ? (
                        documents.map((doc) => (
                          <motion.div 
                            key={doc.document_id}
                            whileHover={{ y: -2 }}
                            onClick={() => fetchAnalysis(doc.document_id)}
                            className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-accent/40 transition-all group cursor-pointer"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-accent" />
                                </div>
                                <div className="max-w-[150px] md:max-w-xs">
                                  <p className="text-sm font-semibold text-foreground truncate group-hover:opacity-80 transition-opacity">{doc.filename}</p>
                                  <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {analyzingDocId === doc.document_id ? "Analyzing..." : "Stored"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div 
                                  onClick={(e) => deleteDocument(doc.document_id, e)}
                                  className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-400"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </div>
                                <div 
                                  className="p-2 rounded-lg bg-white/5 hover:bg-accent/20 text-accent"
                                  title="Analyze Document"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                         <div className="col-span-2 py-12 text-center">
                           <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                           <p className="text-zinc-500 text-sm">No documents found. Start by uploading one.</p>
                           <Link href="/upload" className="text-purple-400 text-xs mt-2 inline-block">Upload Analysis</Link>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Right Sidebar */}
              <div className={`${searchQuery ? 'xl:col-span-3' : ''} glass-card p-6 flex flex-col`}>
                <h3 className="text-xl font-bold text-foreground mb-6">Recent Activity</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">All systems operational</p>
                      <p className="text-xs text-zinc-500 mt-1">AI models are processing documents normally.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                    <h4 className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Pro Tip</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Use the "AI News" tab to see all your summarized documents in one place and perform deep-dive analysis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="news"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {selectedDoc ? (
              <div className="glass-card p-8 min-h-[600px] space-y-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">AI-Native News Intelligence</h3>
                      <p className="text-zinc-500 text-sm">Experience for {selectedDoc.document_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedDoc(null)}
                      className="p-2 rounded-lg hover:bg-white/5 text-zinc-400"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex items-center gap-6 border-b border-white/5 pb-4">
                  {[
                    { id: "summary", label: "Executive Summary", icon: FileText },
                    { id: "arc", label: "Story Arc Tracker", icon: TrendingUp },
                    { id: "video", label: "AI Video Studio", icon: Activity },
                    { id: "vernacular", label: "Vernacular News", icon: ExternalLink },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSubTab(tab.id)}
                      className={`flex items-center gap-2 pb-2 text-sm font-semibold transition-all border-b-2 ${subTab === tab.id ? "text-accent border-accent" : "text-zinc-500 border-transparent hover:text-zinc-300"}`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-3 space-y-6">
                    {subTab === "summary" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div>
                          <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-accent" /> Personalized Summary ({userProfile})
                          </h4>
                          <p className="text-zinc-300 leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/5">
                            {selectedDoc.summary}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground mb-3">Key Facts</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedDoc.key_facts?.map((fact: string, i: number) => (
                              <div key={i} className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                <span className="text-sm text-zinc-400">{fact}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {subTab === "arc" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-accent/10 to-transparent border border-accent/20">
                          <h4 className="text-xl font-bold text-foreground mb-4">Story Arc Visualization</h4>
                          <div className="space-y-8">
                            <div className="relative pl-8 border-l-2 border-accent/30 space-y-8">
                              {selectedDoc.story_arc?.timeline.map((event: any, i: number) => (
                                <div key={i} className="relative">
                                  <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-accent border-4 border-background" />
                                  <span className="text-xs font-bold text-accent uppercase tracking-tighter">{event.date}</span>
                                  <p className="text-sm text-zinc-300 mt-1">{event.event}</p>
                                </div>
                              ))}
                            </div>
                            <div className="pt-6 border-t border-white/5">
                              <h5 className="text-sm font-bold text-zinc-400 uppercase mb-3">Sentiment & Predictions</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                  <p className="text-xs text-zinc-500 mb-1 font-bold italic">SENTIMENT SHIFT</p>
                                  <p className="text-sm text-foreground">{selectedDoc.story_arc?.sentiment_shift}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                                  <p className="text-xs text-accent mb-1 font-bold">"WHAT TO WATCH NEXT"</p>
                                  <p className="text-sm text-accent-foreground font-medium">{selectedDoc.story_arc?.next_prediction}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {subTab === "video" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                         <div className="aspect-video rounded-3xl bg-zinc-900 border border-white/5 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8">
                                <span className="text-xs font-bold text-accent mb-2 uppercase tracking-widest bg-accent/20 px-3 py-1 rounded-full self-start">AI Video Preview</span>
                                <h4 className="text-2xl font-bold text-white mb-2">{selectedDoc.video_script?.headline}</h4>
                                <div className="flex items-center gap-4 text-zinc-400 text-sm">
                                   <Clock className="w-4 h-4" /> 90 Seconds • AI Narrated
                                </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm cursor-pointer">
                                <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center pl-1 shadow-2xl shadow-accent/50 scale-90 group-hover:scale-100 transition-transform">
                                   <ChevronRight className="w-10 h-10 text-white" />
                                </div>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedDoc.video_script?.scenes.map((scene: any, i: number) => (
                               <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-accent/30 transition-all">
                                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Scene {i + 1}</p>
                                  <p className="text-sm text-foreground italic mb-3">"{scene.narration}"</p>
                                  <div className="flex items-center gap-2 text-[11px] text-accent font-medium">
                                     <Activity className="w-3 h-3" /> {scene.visual_suggestion}
                                  </div>
                               </div>
                            ))}
                         </div>
                      </motion.div>
                    )}

                    {subTab === "vernacular" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                         <div className="flex items-center gap-3 mb-4">
                            {["Hindi", "Tamil", "Telugu", "Bengali"].map(lang => (
                               <button 
                                 key={lang} 
                                 onClick={() => translate(lang)}
                                 disabled={translating}
                                 className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-accent/20 hover:text-accent transition-all disabled:opacity-50"
                               >
                                 {lang}
                               </button>
                            ))}
                         </div>
                         {translating ? (
                            <div className="py-20 text-center space-y-4">
                               <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                               <p className="text-zinc-500 font-medium">Context-Aware Vernacular Engine at work...</p>
                            </div>
                         ) : translatedContent ? (
                            <div className="glass-card p-8 bg-zinc-900/50 border-accent/20">
                               <h4 className="text-2xl font-bold text-foreground mb-4 italic">{translatedContent.translated_headline}</h4>
                               <p className="text-lg text-zinc-300 leading-relaxed mb-8">{translatedContent.translated_body}</p>
                               <div className="p-6 rounded-2xl bg-accent/5 border border-accent/10">
                                  <h5 className="text-xs font-bold text-accent uppercase tracking-widest mb-4">Key Term Explanations (Hindi Context)</h5>
                                  <div className="space-y-4">
                                     {translatedContent.key_terms_explained.map((term: any, i: number) => (
                                        <div key={i} className="flex gap-4">
                                           <div className="w-1 h-auto bg-accent/30 rounded-full" />
                                           <div>
                                              <p className="text-sm font-bold text-foreground">{term.term} ({term.translation})</p>
                                              <p className="text-[13px] text-zinc-500">{term.explanation}</p>
                                           </div>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                            </div>
                         ) : (
                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                               <p className="text-zinc-500">Select a language to generate context-aware business news.</p>
                            </div>
                         )}
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-accent/5 border border-accent/20 rounded-2xl">
                      <h4 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Entities Identified</h4>
                      <div className="space-y-3">
                        {selectedDoc.entities?.slice(0, 8).map((ent: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm text-foreground font-medium">{ent.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold uppercase">{ent.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-2">Sentiment Analyzer</h4>
                      <div className="flex items-center gap-3">
                         <div className={`w-3 h-3 rounded-full ${selectedDoc.sentiment === 'positive' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : selectedDoc.sentiment === 'negative' ? 'bg-rose-400' : 'bg-zinc-400'}`} />
                         <span className="text-sm font-bold text-foreground capitalize">{selectedDoc.sentiment}</span>
                      </div>
                    </div>

                    <Link href={`/ask-ai?docId=${selectedDoc.document_id}`}>
                      <button className="w-full glass-button flex items-center justify-center gap-2 group">
                        <span>Deep Dive with AI</span>
                        <ChevronRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground italic">Summarized AI News</h3>
                    <p className="text-xs text-zinc-500 mt-1">Select documents to use the <span className="text-accent font-bold">News Navigator</span></p>
                  </div>
                  <div className="flex items-center gap-4">
                    {selectedForBriefing.length > 0 && (
                       <motion.button 
                         initial={{ scale: 0.9, opacity: 0 }}
                         animate={{ scale: 1, opacity: 1 }}
                         onClick={generateBriefing}
                         className="px-6 py-2.5 rounded-2xl bg-accent text-foreground font-bold shadow-2xl shadow-accent/40 flex items-center gap-2 hover:scale-105 transition-all"
                       >
                         <Activity className="w-5 h-5" /> Synthesize Briefing ({selectedForBriefing.length})
                       </motion.button>
                    )}
                    <div className="px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold">
                      {allInsights.length} Articles Analyzed
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allInsights.length > 0 ? (
                    allInsights.map((insight) => (
                      <motion.div 
                        key={insight.id} 
                        whileHover={{ y: -5 }}
                        className={`glass-card p-6 cursor-pointer group hover:border-accent/40 transition-all flex flex-col h-full relative ${selectedForBriefing.includes(insight.id) ? 'border-accent/60 bg-accent/5' : ''}`}
                      >
                        <div 
                          className="absolute top-4 right-4 z-10"
                          onClick={(e) => { e.stopPropagation(); toggleBriefingSelect(insight.id); }}
                        >
                           <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedForBriefing.includes(insight.id) ? 'bg-accent border-accent' : 'border-zinc-700 bg-black/40'}`}>
                              {selectedForBriefing.includes(insight.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                           </div>
                        </div>

                        <div onClick={() => fetchAnalysis(insight.id)} className="flex-1 flex flex-col pt-2">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                              <Activity className="w-5 h-5 text-accent" />
                            </div>
                            <span className="text-[10px] text-zinc-600">{insight.date}</span>
                          </div>
                          <h4 className="text-lg font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors mb-3">
                            {insight.title}
                          </h4>
                          <p className="text-sm text-zinc-500 line-clamp-3 mb-6 flex-1">
                            {insight.summary}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                            {insight.entities?.map((tag: string) => (
                              <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-zinc-400">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-3 glass-card p-12 text-center">
                      <FileText className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                      <h4 className="text-lg font-bold text-zinc-300">No AI News Yet</h4>
                      <p className="text-zinc-500 mt-2">Upload and analyze documents to see them here.</p>
                      <Link href="/upload" className="mt-6 inline-block glass-button">Upload Now</Link>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* News Navigator Briefing Overlay */}
            <AnimatePresence>
               {isBriefingOpen && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 overflow-y-auto"
                  >
                     <motion.div 
                       initial={{ scale: 0.9, y: 20 }}
                       animate={{ scale: 1, y: 0 }}
                       className="glass-card w-full max-w-5xl bg-zinc-900 border-accent/30 p-8 md:p-12 relative min-h-[80vh]"
                     >
                        <button 
                          onClick={() => { setIsBriefingOpen(false); setSelectedForBriefing([]); }}
                          className="absolute top-8 right-8 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                           <X className="w-6 h-6 text-zinc-400" />
                        </button>

                        {generatingBriefing ? (
                           <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                              <div className="relative">
                                 <div className="w-24 h-24 border-8 border-accent/20 border-t-accent rounded-full animate-spin" />
                                 <Activity className="absolute inset-0 m-auto w-8 h-8 text-accent animate-pulse" />
                              </div>
                              <div className="text-center">
                                 <h4 className="text-2xl font-bold text-white mb-2 tracking-tight">Synthesizing Intelligence Briefing</h4>
                                 <p className="text-zinc-500 font-medium">Cross-referencing {selectedForBriefing.length} documents for {userProfile} profile...</p>
                              </div>
                           </div>
                        ) : briefingResult ? (
                           <div className="space-y-12 pb-12">
                              <div className="space-y-4">
                                 <span className="text-xs font-black text-accent uppercase tracking-widest px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full">Mission Intelligence Briefing</span>
                                 <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter">
                                    {briefingResult.title}
                                 </h2>
                                 <div className="flex flex-wrap gap-4 text-zinc-400 text-sm font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Verified Insights</div>
                                    <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-accent" /> Cross-Document Synthesis</div>
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                 <div className="lg:col-span-2 space-y-10">
                                    <section>
                                       <h3 className="text-lg font-black text-accent uppercase tracking-widest mb-6 border-l-4 border-accent pl-4">The Synthesis</h3>
                                       <p className="text-xl text-zinc-300 leading-relaxed font-medium">
                                          {briefingResult.synthesis}
                                       </p>
                                    </section>

                                    <section>
                                       <h3 className="text-lg font-black text-accent uppercase tracking-widest mb-6 border-l-4 border-accent pl-4">Interactive Intelligence Points</h3>
                                       <div className="space-y-4">
                                          {briefingResult.briefing_points.map((pt: any, i: number) => (
                                             <div key={i} className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-accent/20 transition-all group">
                                                <div className="flex items-start gap-4">
                                                   <span className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-black text-xs shrink-0">{i+1}</span>
                                                   <div className="space-y-2">
                                                      <h4 className="text-lg font-bold text-white group-hover:text-accent transition-colors">{pt.point}</h4>
                                                      <p className="text-sm text-zinc-400 leading-relaxed">{pt.detail}</p>
                                                   </div>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    </section>
                                 </div>

                                 <div className="space-y-8">
                                    <div className="p-8 rounded-3xl bg-accent/5 border border-accent/20 space-y-6">
                                       <h3 className="text-xs font-black text-accent uppercase tracking-widest">Profile Impact: {userProfile}</h3>
                                       <div className="space-y-4">
                                          {briefingResult.profile_relevance?.map((rel: any, i: number) => (
                                             <div key={i} className="space-y-1">
                                                <p className="text-xs font-bold text-white uppercase">{rel.factor}</p>
                                                <p className="text-[13px] text-zinc-500 italic">"{rel.impact}"</p>
                                             </div>
                                          ))}
                                       </div>
                                    </div>

                                    <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6">
                                       <h3 className="text-xs font-black text-white uppercase tracking-widest">Recommended Intelligence Paths</h3>
                                       <div className="space-y-3">
                                          {briefingResult.suggested_questions?.map((q: string, i: number) => (
                                             <button key={i} className="w-full text-left p-3 rounded-xl bg-white/5 text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">
                                                {q}
                                             </button>
                                          ))}
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        ) : null}
                     </motion.div>
                  </motion.div>
               )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

