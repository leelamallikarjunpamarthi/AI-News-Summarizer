"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Save, 
  Send, 
  Heading1, 
  Type, 
  Layout, 
  RefreshCcw,
  ArrowRight,
  FileText,
  Download
} from "lucide-react";

export default function ArticleGenerator() {
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setDocumentId(localStorage.getItem("documentId"));
    const savedAnalysis = localStorage.getItem("analysisResult");
    if (savedAnalysis) {
      try {
        const parsed = JSON.parse(savedAnalysis);
        // Combine key facts and maybe summary into insights feed
        const facts = parsed.key_facts || [];
        if (facts.length > 0) {
           setInsights(facts);
        } else if (parsed.summary) {
           setInsights([parsed.summary]);
        }
      } catch(e) {
        console.error("Failed to parse analysis");
      }
    }
  }, []);

  const generateDraft = async () => {
    if (!documentId) {
       setErrorMsg("No document analyzed. Please upload a document first.");
       return;
    }
    
    setIsGenerating(true);
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:8000/api/v1/generate-article", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ document_id: documentId, tone: "journalistic" }),
      });

      if (!res.ok) {
         throw new Error("Failed to generate article");
      }

      const data = await res.json();
      setContent(data.article);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to generate the article. Make sure the backend is running.");
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadArticle = () => {
    if (!content) return;
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `draft_${new Date().getTime()}.md`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Article Generator</h2>
          <p className="text-zinc-500 mt-1">Transform discovered insights into professional news drafts.</p>
        </div>
        <div className="flex gap-3">
          <button 
             onClick={downloadArticle}
             disabled={!content}
             className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm text-zinc-300 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Download
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:opacity-90 rounded-xl transition-colors text-sm font-bold text-accent-foreground shadow-accent">
            <Send className="w-4 h-4" /> Publish
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-medium">
           {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Insight Feed */}
        <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
          <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest px-2">Knowledge Base</h4>
          {insights.length === 0 ? (
            <div className="text-xs text-zinc-500 px-2 italic">Upload and analyze a document first to see insights here.</div>
          ) : (
            insights.map((insight, i) => (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.02 }}
                className="glass-card p-4 text-xs text-zinc-300 cursor-pointer border-accent/10 hover:border-accent/30"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p>{insight}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Center: Editor Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-6 min-h-[600px] flex flex-col relative">
            <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-6">
              <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400"><Heading1 className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400"><Type className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400"><Layout className="w-5 h-5" /></button>
              <div className="h-6 w-px bg-white/10 mx-2" />
              <button 
                onClick={generateDraft}
                disabled={isGenerating}
                className="ml-auto flex items-center gap-2 text-accent hover:opacity-80 disabled:opacity-50 transition-colors text-sm font-semibold"
              >
                {isGenerating ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? "Generating Draft..." : "AI Autocomplete"}
              </button>
            </div>

            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start drafting your article here, or use 'AI Autocomplete' to generate a draft from your insights..."
              className="flex-1 w-full bg-transparent resize-none focus:outline-none text-foreground leading-relaxed placeholder:text-zinc-700 whitespace-pre-wrap font-sans"
            />

            {content === "" && !isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-xl font-bold">Workspace Empty</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4 flex items-center justify-between group cursor-pointer hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold">SEO</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">SEO Score: 92/100</p>
                  <p className="text-xs text-zinc-500">Excellent keyword density</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-700 group-hover:text-emerald-400 transition-colors" />
            </div>
            
            <div className="glass-card p-4 flex items-center justify-between group cursor-pointer hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-400 font-bold">RD</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Readability: Grade 10</p>
                  <p className="text-xs text-zinc-500">Standard for news reporting</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-700 group-hover:text-blue-400 transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
