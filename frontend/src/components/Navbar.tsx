"use client";

import { Search, Bell, User, Menu } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [username, setUsername] = useState("Guest User");
  const router = useRouter();

  // Read localStorage only after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        if (profile.username) setUsername(profile.username);
      } catch {
        // ignore JSON parse errors
      }
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 glass-card m-4 mt-2 mb-0 border-b-0 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-4 flex-1">
        <button className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors">
          <Menu className="w-6 h-6 text-zinc-400" />
        </button>
        <form onSubmit={handleSearch} className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search insights, articles, trends..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-zinc-500"
          />
        </form>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-white/5 rounded-xl transition-colors relative">
          <Bell className="w-5 h-5 text-zinc-400" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />
        </button>
        
        <div className="h-8 w-px bg-white/10 mx-2" />
        
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{username}</p>
            <p className="text-xs text-zinc-500">Premium Plan</p>
          </div>
          <Link href="/settings?tab=profile">
            <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center border-accent/30 hover:border-accent/60 transition-colors cursor-pointer group">
              <User className="w-5 h-5 text-accent group-hover:opacity-80 transition-opacity" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
