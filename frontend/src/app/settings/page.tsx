"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  User, 
  Settings as SettingsIcon, 
  Database, 
  Palette, 
  Key, 
  Smartphone,
  Save,
  ChevronRight,
  Mail,
  Lock,
  Eye,
  Trash2,
  Download,
  Moon,
  Sun,
  Monitor,
  Check,
  AlertCircle
} from "lucide-react";

const sections = [
  { id: "profile", name: "Profile Settings", icon: User, description: "Manage your account details and preferences." },
  { id: "api", name: "API Configuration", icon: Key, description: "Manage LLM providers and API keys." },
  { id: "theme", name: "Theme & Workspace", icon: Palette, description: "Customize the interface and visual settings." },
  { id: "data", name: "Data Management", icon: Database, description: "Manage your indexed documents and collections." },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("api");
  const [profile, setProfile] = useState({ username: "Guest User", email: "guest@example.com" });
  const [theme, setTheme] = useState("dark");
  const [accentColor, setAccentColor] = useState("bg-purple-600");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && sections.some(s => s.id === tab)) {
      setActiveTab(tab);
    }
    
    // Load profile
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }

    // Load theme
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);

    // Load accent
    const savedAccent = localStorage.getItem("accentColor") || "bg-purple-600";
    setAccentColor(savedAccent);
    applyAccent(savedAccent);
  }, [searchParams]);

  const applyAccent = (colorClass: string) => {
    const colors: Record<string, string> = {
      "bg-purple-600": "#9333ea",
      "bg-blue-600": "#2563eb",
      "bg-emerald-600": "#059669",
      "bg-rose-600": "#e11d48"
    };
    const glows: Record<string, string> = {
      "bg-purple-600": "rgba(147, 51, 234, 0.3)",
      "bg-blue-600": "rgba(37, 99, 235, 0.3)",
      "bg-emerald-600": "rgba(5, 150, 105, 0.3)",
      "bg-rose-600": "rgba(225, 29, 72, 0.3)"
    };
    document.documentElement.style.setProperty('--accent', colors[colorClass]);
    document.documentElement.style.setProperty('--accent-glow', glows[colorClass]);
  };

  const handleSaveProfile = () => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
    showStatus("Profile saved successfully!");
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.remove("dark", "light");
    if (newTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.add(isDark ? "dark" : "light");
    } else {
      document.documentElement.classList.add(newTheme);
    }
    showStatus(`Theme switched to ${newTheme}`);
  };

  const handleAccentChange = (color: string) => {
    setAccentColor(color);
    localStorage.setItem("accentColor", color);
    applyAccent(color);
    showStatus("Accent color updated!");
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete all uploaded documents? This action cannot be undone.")) return;
    
    try {
      const res = await fetch("http://localhost:8000/api/v1/documents");
      const data = await res.json();
      if (data.documents) {
        for (const doc of data.documents) {
          await fetch(`http://localhost:8000/api/v1/documents/${doc.document_id}`, { method: "DELETE" });
        }
      }
      localStorage.removeItem("documentId");
      showStatus("All documents deleted successfully!");
    } catch (err) {
      showStatus("Failed to delete documents.");
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem("chatHistory");
    showStatus("Search history cleared.");
  };

  const showStatus = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8 rounded-3xl space-y-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-600/20 p-2 rounded-lg">
                <User className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Profile Settings</h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Username</label>
                  <input 
                    type="text" 
                    value={profile.username}
                    onChange={(e) => setProfile({...profile, username: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-accent/50 placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="email" 
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-sm text-foreground focus:outline-none focus:border-accent/50 placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-6">
                <h4 className="text-sm font-semibold text-foreground">Change Password</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Current Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-accent/50 placeholder:text-zinc-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-accent/50 placeholder:text-zinc-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Confirm New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-accent/50 placeholder:text-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  onClick={handleSaveProfile}
                  className="glass-button text-foreground font-bold flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Profile
                </button>
              </div>
            </div>
          </motion.div>
        );

      case "api":
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8 rounded-3xl"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-purple-600/20 p-2 rounded-lg">
                <Key className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground">API Configuration</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Primary AI Provider</label>
                <select 
                  defaultValue="gemini"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-accent/50 text-foreground"
                >
                  <option value="gemini" className="bg-zinc-900">Google Gemini 1.5 Flash</option>
                  <option value="openai" className="bg-zinc-900">OpenAI GPT-4o-mini</option>
                  <option value="anthropic" className="bg-zinc-900">Anthropic Claude 3.5 Sonnet</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">OpenAI API Key</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value="sk-proj-••••••••••••••••"
                    readOnly
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-4 pr-12 text-sm text-zinc-400 focus:outline-none focus:border-accent/50"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-accent font-bold hover:opacity-80">Edit</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Gemini API Key</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value="AIzaSyA-RhJiO0Bd_w2pXW3XPjdtJyGq0k3a39E"
                    readOnly
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-4 pr-12 text-sm text-zinc-400 focus:outline-none focus:border-accent/50"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-accent font-bold hover:opacity-80">Edit</button>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex gap-4">
                <button className="glass-button text-foreground font-bold flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Keys
                </button>
              </div>
            </div>
          </motion.div>
        );

      case "theme":
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8 rounded-3xl"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-purple-600/20 p-2 rounded-lg">
                <Palette className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Theme & Workspace</h3>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-medium text-zinc-400">Interface Theme</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: "dark", name: "Deep Space", icon: Moon },
                    { id: "light", name: "Arctic", icon: Sun },
                    { id: "system", name: "System", icon: Monitor },
                  ].map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col items-center gap-2 ${
                        theme === t.id 
                        ? "bg-accent/10 border-accent/50 text-foreground shadow-accent" 
                        : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      <t.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-zinc-400">Accent Color</label>
                <div className="flex gap-4">
                  {["bg-purple-600", "bg-blue-600", "bg-emerald-600", "bg-rose-600"].map((color) => (
                    <div 
                      key={color}
                      onClick={() => handleAccentChange(color)}
                      className={`w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-transform ${color} ${
                        accentColor === color ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );

      case "data":
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8 rounded-3xl space-y-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-600/20 p-2 rounded-lg">
                <Database className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Data Management</h3>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Index Persistence</p>
                  <p className="text-xs text-zinc-500">Manage your local storage and vector database.</p>
                </div>
                <button className="text-xs font-bold text-accent hover:opacity-80 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Backup
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <h4 className="text-sm font-semibold text-rose-500">Danger Zone</h4>
                <div className="space-y-3">
                  <button 
                    onClick={handleClearHistory}
                    className="w-full p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 text-sm font-medium transition-colors flex items-center justify-between group"
                  >
                    <span>Clear Search History</span>
                    <Trash2 className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                  </button>
                  <button 
                    onClick={handleDeleteAll}
                    className="w-full p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 text-sm font-medium transition-colors flex items-center justify-between group"
                  >
                    <span>Delete All Analyzed Documents</span>
                    <Trash2 className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Settings</h2>
          <p className="text-zinc-500 mt-1">Configure your workspace and AI preferences.</p>
        </div>
        <AnimatePresence>
          {saveStatus && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold"
            >
              <Check className="w-3 h-3" /> {saveStatus}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation */}
        <div className="space-y-2">
          {sections.map((section) => (
            <div 
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                activeTab === section.id 
                ? "bg-accent/20 border border-accent/30 shadow-accent text-foreground" 
                : "hover:bg-white/5 text-zinc-400 hover:text-foreground"
              }`}
            >
              <section.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{section.name}</span>
              <ChevronRight className="ml-auto w-4 h-4 opacity-50" />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-2 min-h-[500px]">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
