"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload as UploadIcon, 
  FileText, 
  X, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState("general");

  useEffect(() => {
    // Load recent upload from localStorage on mount
    const savedAnalysis = localStorage.getItem("analysisResult");
    const savedDocId = localStorage.getItem("documentId");
    if (savedAnalysis && savedDocId) {
      try {
        const parsed = JSON.parse(savedAnalysis);
        setRecentUploads([
          {
            docId: savedDocId,
            summary: parsed.summary,
            date: new Date().toLocaleDateString()
          }
        ]);
      } catch (e) {
        console.error("Failed to parse saved analysis", e);
      }
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    if (files.length <= 1) {
       setStatus("idle");
       setProgress(0);
       setErrorMessage("");
    }
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setStatus("uploading");
    setErrorMessage("");
    
    const processedDocs: any[] = [];

    try {
      // 1. Process all files in parallel
      const processedDocs = await Promise.all(
        files.map(async (file, i) => {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          // 1a. Upload
          const formData = new FormData();
          formData.append("file", file);

          const uploadRes = await fetch(`${apiUrl}/api/v1/upload`, {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            const err = await uploadRes.json();
            throw new Error(`[${file.name}] ${err.detail || "Upload failed"}`);
          }

          const uploadData = await uploadRes.json();
          const documentId = uploadData.document_id;
          const isBackground = uploadRes.status === 202;
          
          let summary = "Processing document in the background... It will appear once OCR and indexing are complete.";

          if (!isBackground) {
            // 1b. Analyze (only if not a background task)
            const analyzeRes = await fetch(`${apiUrl}/api/v1/analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ document_id: documentId, user_profile: userProfile }),
            });

            if (!analyzeRes.ok) {
              const err = await analyzeRes.json();
              throw new Error(`[${file.name}] ${err.detail || "Analysis failed"}`);
            }

            const analysisData = await analyzeRes.json();
            summary = analysisData.summary;
            
            // Store results locally as we go
            localStorage.setItem("documentId", documentId);
            localStorage.setItem("analysisResult", JSON.stringify(analysisData));
          }
          
          return {
            docId: documentId,
            filename: file.name,
            summary: summary,
            date: new Date().toLocaleDateString(),
            status: isBackground ? "processing" : "completed"
          };
        })
      );

      setRecentUploads(prev => [...processedDocs, ...prev]);
      setProgress(100);
      setStatus("success");
      setFiles([]); // Clear queue on success

      // Redirect to dashboard after 2.5s so user sees their uploaded documents
      setTimeout(() => {
        router.push("/?uploaded=1");
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "An unexpected error occurred");
    }
  };
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Upload & Analysis</h2>
        <p className="text-zinc-500 mt-1">Upload news articles or documents for AI-powered insight extraction.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Zone */}
        <div className="lg:col-span-2 space-y-6">
          <div 
            className="glass-card border-2 border-dashed border-accent/20 hover:border-accent/40 transition-colors p-12 text-center relative group"
          >
            <input 
              type="file" 
              accept=".pdf,.docx,.txt"
              multiple 
              onChange={onFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadIcon className="w-8 h-8 text-accent" />
            </div>
            <h4 className="text-lg font-semibold text-foreground">Drop files here or click to upload</h4>
            <p className="text-sm text-zinc-500 mt-2">Support for PDF, DOCX, TXT (Max 50MB)</p>
          </div>

          <AnimatePresence>
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-semibold text-foreground">Selected Files ({files.length})</h5>
                  <button onClick={() => { setFiles([]); setStatus("idle"); setProgress(0); }} className="text-xs text-zinc-500 hover:text-foreground transition-colors">Clear All</button>
                </div>
                <div className="space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-accent" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{file.name}</p>
                          <p className="text-xs text-zinc-600">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button onClick={() => removeFile(i)} className="p-1 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors z-20 relative">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={startAnalysis}
                  disabled={status === "uploading" || status === "analyzing" || status === "success"}
                  className="w-full mt-6 glass-button text-foreground font-bold py-3 flex items-center justify-center gap-2"
                >
                  {(status === "uploading" || status === "analyzing") ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {status === "analyzing" ? "Analyzing Document..." : "Uploading..."}
                    </>
                  ) : status === "success" ? (
                     <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      Success
                     </>
                  ) : (
                    "Start Analysis"
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status / History Sidebar */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h5 className="font-semibold text-foreground mb-4">Status</h5>
            {status === "idle" && (
              <div className="flex items-center gap-3 text-zinc-500 text-sm">
                <AlertCircle className="w-5 h-5" />
                No active processing
              </div>
            )}
            {(status === "uploading" || status === "analyzing") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-accent">{status === "analyzing" ? "Analyzing Entities & Summarizing..." : "Uploading & Extracting..."}</span>
                  <span className="text-zinc-500">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-accent shadow-accent transition-all duration-300"
                  />
                </div>
              </div>
            )}
            {status === "success" && (
              <div className="flex items-center gap-3 text-emerald-400 text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Analysis Complete!
              </div>
            )}
            {status === "error" && (
              <div className="flex items-start gap-3 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{errorMessage}</p>
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h5 className="font-semibold text-foreground mb-4 italic">Recent Uploads</h5>
            <div className="space-y-4 text-xs text-zinc-400">
              {recentUploads.length === 0 ? (
                <p className="text-zinc-600">Previous data will appear here once analysis is complete.</p>
              ) : (
                recentUploads.map((upload, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                       <span className="font-medium text-emerald-400">Analyzed Document</span>
                       <span className="text-zinc-600">{upload.date}</span>
                    </div>
                    <p className="line-clamp-3 text-zinc-300">{upload.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

