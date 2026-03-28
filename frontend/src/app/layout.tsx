"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.classList.remove("dark", "light");
    if (savedTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.add(isDark ? "dark" : "light");
    } else {
      document.documentElement.classList.add(savedTheme);
    }

    // Apply accent color on mount
    const savedAccent = localStorage.getItem("accentColor") || "bg-purple-600";
    applyAccent(savedAccent);
  }, []);

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
    if (colors[colorClass]) {
      document.documentElement.style.setProperty('--accent', colors[colorClass]);
      document.documentElement.style.setProperty('--accent-glow', glows[colorClass]);
    }
  };

  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-purple-500/30">
        <div className="flex min-h-screen relative overflow-hidden transition-colors duration-500">
          {/* Decorative background elements */}
          <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full" />
          </div>

          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen lg:ml-64 relative z-10">
            <Navbar />
            <main className="flex-1 p-4 lg:p-8 mt-20 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

