"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Link as LinkIcon,
  FileText,
  Zap,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  sources?: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AskAIPage() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your AI insights assistant. Ask me anything about your analyzed document — I'll answer instantly.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Resolve document ID from URL param or localStorage ──────────────────────
  useEffect(() => {
    const urlDocId = searchParams.get("docId");
    const storedDocId = localStorage.getItem("documentId");
    const resolvedId = urlDocId || storedDocId;
    setDocumentId(resolvedId);
    if (resolvedId) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Ready! Ask me anything about document **${resolvedId}**.`,
        },
      ]);
    }
  }, [searchParams]);

  // ── Auto-scroll on new content ───────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── SSE Streaming handler ────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const q = input.trim();
    if (!q || isTyping) return;

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const userMsgId = `u-${Date.now()}`;
    const aiMsgId = `a-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: q },
      { id: aiMsgId, role: "assistant", content: "", streaming: true },
    ]);
    setInput("");
    setIsTyping(true);

    if (!documentId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                content:
                  "No document found. Please upload and analyze a document first.",
                streaming: false,
              }
            : m
        )
      );
      setIsTyping(false);
      return;
    }

    try {
      const url = `${API_URL}/api/v1/ask/stream?document_id=${encodeURIComponent(
        documentId
      )}&question=${encodeURIComponent(q)}`;

      const response = await fetch(url, {
        signal: abortRef.current.signal,
        headers: { Accept: "text/event-stream" },
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.error) throw new Error(payload.error);
            if (payload.token) {
              accumulated += payload.token;
              // Update the streaming message in-place
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, content: accumulated } : m
                )
              );
            }
            if (payload.done) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, content: payload.answer || accumulated, streaming: false }
                    : m
                )
              );
            }
          } catch {
            // Ignore malformed lines
          }
        }
      }

      // Ensure streaming flag cleared
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, streaming: false } : m
        )
      );
    } catch (err: any) {
      if (err.name === "AbortError") return; // user triggered new request
      const errMsg = err.message || String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: `⚠️ ${errMsg}`, streaming: false }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  }, [input, documentId, isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center border-accent/30">
            <Bot className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Ask AI</h2>
            <p className="text-sm text-zinc-500">
              Streaming answers — first response in &lt;1s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-bold text-accent">Ultra Fast</span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 glass-card p-6 overflow-hidden flex flex-col relative">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-white/10"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-zinc-800" : "bg-accent/20"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles
                      className={`w-4 h-4 text-accent ${msg.streaming ? "animate-pulse" : ""}`}
                    />
                  )}
                </div>

                <div
                  className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "text-right" : ""}`}
                >
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent text-accent-foreground shadow-accent"
                        : "bg-white/5 text-foreground border border-white/5 whitespace-pre-wrap"
                    }`}
                  >
                    {msg.content || (
                      <span className="inline-flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.3s]" />
                      </span>
                    )}
                    {/* Blinking cursor while streaming */}
                    {msg.streaming && msg.content && (
                      <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse" />
                    )}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/5 text-[10px] text-zinc-500"
                        >
                          <LinkIcon className="w-3 h-3 text-accent" />
                          {source}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="mt-6 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your document... (Enter to send)"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-14 text-sm focus:outline-none focus:border-accent/50 transition-colors resize-none h-14 overflow-hidden text-foreground placeholder:text-zinc-600"
            disabled={isTyping}
          />
          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-accent hover:opacity-90 disabled:opacity-30 rounded-xl transition-all shadow-accent group"
          >
            <Send className="w-4 h-4 text-accent-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
