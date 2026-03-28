"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Upload, 
  FileEdit, 
  MessageSquare, 
  Settings, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Upload & Analysis", href: "/upload", icon: Upload },
  { name: "Article Generator", href: "/article-generator", icon: FileEdit },
  { name: "Ask AI", href: "/ask-ai", icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 h-full w-64 glass-card m-4 hidden lg:flex flex-col border-r-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-accent p-2 rounded-lg shadow-accent">
          <Sparkles className="text-accent-foreground w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold purple-gradient-text uppercase tracking-wider">
          AI News
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? "bg-accent/20 border border-accent/30 shadow-accent" 
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${isActive ? "text-accent" : "text-zinc-400 group-hover:text-foreground"}`} />
                  <span className={`font-medium ${isActive ? "text-foreground" : "text-zinc-400 group-hover:text-foreground"}`}>
                    {item.name}
                  </span>
                </div>
                {isActive && (
                  <motion.div layoutId="active-indicator">
                    <ChevronRight className="w-4 h-4 text-accent" />
                  </motion.div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <Link href="/settings">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
            <Settings className="w-5 h-5 text-zinc-400 group-hover:text-foreground" />
            <span className="font-medium text-zinc-400 group-hover:text-foreground">Settings</span>
          </div>
        </Link>
        <div className="mt-4 p-4 glass-card bg-accent/10 border-accent/20 text-xs text-foreground">
          <p className="opacity-70">Powered by Advanced AI</p>
          <div className="w-full h-1 bg-white/10 mt-2 rounded-full overflow-hidden">
            <div className="w-3/4 h-full bg-accent shadow-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}
