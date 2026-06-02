"use client";

import React, { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import Image from "next/image";
import { Sun, Moon } from "lucide-react";

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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8 overflow-hidden transition-colors duration-300">
      {/* Background visual graphics */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-400/10 blur-[120px] dark:bg-violet-900/5 pointer-events-none transition-all duration-500" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-400/10 blur-[120px] dark:bg-indigo-900/5 pointer-events-none transition-all duration-500" />

      {/* Theme Toggler (Top Right) */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full border border-zinc-200/50 bg-white/80 hover:bg-zinc-100 text-zinc-600 dark:border-zinc-800/50 dark:bg-zinc-900/80 dark:hover:bg-zinc-850 dark:text-zinc-300 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
          title="Toggle Light/Dark Theme"
        >
          {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
      </div>

      <div className="z-10 w-full flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-zinc-900 to-zinc-700 dark:from-zinc-50 dark:to-zinc-200 flex items-center justify-center shadow-lg shadow-zinc-900/10 dark:shadow-zinc-50/5">
            <span className="text-xl font-bold tracking-tight text-white dark:text-black">A</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mt-2">Aika</h2>
          <p className="text-xs font-semibold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
            Time & Task Orchestration
          </p>
        </div>

        <AuthCard />
      </div>
    </div>
  );
}
