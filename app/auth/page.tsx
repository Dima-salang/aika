"use client";

import React, { useEffect, useState, Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import Image from "next/image";
import { Sun, Moon, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check local storage or document class
    const isDarkClass = document.documentElement.classList.contains("dark");
    setIsDark(isDarkClass);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground dark:bg-[#0a0a0c] dark:text-on-surface p-4 md:p-8 overflow-hidden font-sans">
      {/* Decorative Grid Mesh Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-outline-variant)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-outline-variant)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.15] dark:opacity-25 pointer-events-none" />
      
      {/* Decorative Neon Blurs */}
      <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[350px] h-[350px] bg-tertiary/5 dark:bg-tertiary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Theme Toggler (Top Right) */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full border border-outline-variant/10 bg-surface-container-low/80 dark:bg-[#131315]/80 text-outline hover:text-on-surface backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
          title="Toggle Light/Dark Theme"
        >
          {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
      </div>

      <div className="z-10 w-full flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-on-primary">
              A
            </div>
            <span className="font-heading font-extrabold tracking-tight text-lg text-on-surface">
              Aika
            </span>
          </div>
          <p className="text-[10px] font-bold tracking-widest text-outline uppercase mt-1">
            Time & Task Orchestration
          </p>
        </div>

        <Suspense fallback={
          <div className="w-full max-w-md border border-outline-variant/10 bg-surface-container-lowest/60 dark:bg-[#131315]/60 backdrop-blur-md shadow-md rounded-2xl p-8 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-medium text-outline">Loading authentication portal...</p>
          </div>
        }>
          <AuthCard />
        </Suspense>
      </div>
    </div>
  );
}
