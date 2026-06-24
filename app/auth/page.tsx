"use client";

import React, { useEffect, useState, Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthDither } from "@/components/auth/auth-dither";
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
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2 bg-background text-foreground dark:bg-[#0a0a0c] dark:text-on-surface overflow-hidden font-sans">
      
      {/* Theme Toggler */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full border border-outline-variant/10 bg-surface-container-low/80 dark:bg-[#131315]/80 text-outline hover:text-on-surface backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
          title="Toggle Light/Dark Theme"
        >
          {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
      </div>

      {/* Left Column: Auth Card Form */}
      <div className="relative flex flex-col items-center justify-center p-6 md:p-12 z-10">
        {/* Decorative Grid Mesh Background for Left Column only */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-outline-variant)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-outline-variant)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.15] dark:opacity-25 pointer-events-none" />

        <div className="w-full max-w-xl space-y-8 z-10">
          <div className="flex flex-col items-start gap-2 pl-4 sm:pl-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center font-black text-on-primary text-base">
                A
              </div>
              <span className="font-heading font-black tracking-tight text-xl text-on-surface">
                Aika
              </span>
            </div>
            <p className="text-[10px] font-black tracking-widest text-outline uppercase mt-1">
              Simple Time Tracker
            </p>
          </div>

          <Suspense fallback={
            <div className="w-full flex flex-col items-center justify-center py-24 space-y-4 h-[400px]">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-bold text-outline">Loading form...</p>
            </div>
          }>
            <AuthCard />
          </Suspense>
        </div>
      </div>

      {/* Right Column: Dithered graphic panel (Hidden on mobile) */}
      <div className="hidden md:flex relative flex-col items-center justify-center bg-surface-container-low dark:bg-[#0f0f12] border-l border-outline-variant/30 overflow-hidden">
        
        {/* WebGL AuthDither component overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-60">
          <AuthDither />
        </div>

      </div>

    </div>
  );
}
