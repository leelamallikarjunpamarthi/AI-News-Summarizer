"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

export default function StatCard({ title, value, change, icon: Icon, trend }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="glass-card p-6 flex items-center gap-4 group cursor-pointer"
    >
      <div className="bg-accent/20 p-4 rounded-2xl group-hover:bg-accent/30 transition-colors">
        <Icon className="w-6 h-6 text-accent group-hover:scale-110 transition-transform duration-300" />
      </div>
      
      <div className="flex-1">
        <p className="text-sm text-zinc-500 font-medium">{title}</p>
        <div className="flex items-end gap-2">
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
          {change && (
            <span className={`text-xs font-medium mb-1 ${
              trend === "up" ? "text-emerald-400" : 
              trend === "down" ? "text-rose-400" : 
              "text-zinc-500"
            }`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
