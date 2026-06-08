"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Play, Square, Sparkles, Clock, Check, BarChart3, Users, Keyboard, ArrowRight } from "lucide-react";
import { toast } from "sonner";
export function LandingPage() {
  // Timer states for the interactive mockup
  const [taskName, setTaskName] = useState("");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [selectedTag, setSelectedTag] = useState("School");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Key highlight states for keyboard playground
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});
  // Start/Stop timer simulation
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTaskName((prev) => {
          if (!prev) return "";
          return prev;
        });
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);
  const handleStartStop = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      const displayTask = taskName.trim() || "Building my project";
      const hours = (timerSeconds / 3600).toFixed(4);
      toast.success(`Logged: ${timerSeconds} seconds on "${displayTask}" under #${selectedTag}!`, {
        description: "In the real app, this goes straight into your dashboard charts.",
        duration: 5000,
      });
      setTimerSeconds(0);
    } else {
      setIsTimerRunning(true);
    }
  };
  // Format seconds to readable timer
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  // Listen to physical key presses to light up the playground
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["t", "n", "/"].includes(key)) {
        setActiveKeys((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => {
          setActiveKeys((prev) => ({ ...prev, [key]: false }));
        }, 300);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground dark:bg-[#0a0a0c] dark:text-on-surface flex flex-col items-center overflow-x-hidden font-sans">
      {/* Decorative Grid Mesh Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-outline-variant)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-outline-variant)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.15] dark:opacity-25 pointer-events-none" />
      {/* Decorative Neon Blurs */}
      <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[350px] h-[350px] bg-tertiary/5 dark:bg-tertiary/10 rounded-full blur-[100px] pointer-events-none" />
      {/* Header */}
      <header className="w-full sticky top-0 z-50 border-b border-outline-variant/10 backdrop-blur-md bg-background/70 dark:bg-[#0a0a0c]/70 transition-colors duration-300">
        <div className="w-full max-w-6xl mx-auto h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-on-primary">
              A
            </div>
            <span className="font-heading font-extrabold tracking-tight text-lg text-on-surface">
              Aika
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <button className="text-body-sm font-semibold text-outline hover:text-on-surface transition-colors">
                Sign In
              </button>
            </Link>
            <Link href="/auth">
              <button className="rounded-lg bg-primary hover:bg-primary/95 text-on-primary text-body-sm px-4 py-2 font-bold transition-all hover:shadow-[0_0_15px_rgba(192,193,255,0.4)] active:scale-[0.98]">
                Launch App
              </button>
            </Link>
          </div>
        </div>
      </header>
      {/* Main Hero & Content container */}
      <main className="w-full max-w-5xl px-6 flex flex-col items-center z-10">
        
        {/* Hero Headline */}
        <section className="text-center pt-20 pb-12 space-y-6 max-w-3xl">
          
          <h1 className="text-4xl sm:text-6xl font-heading font-black tracking-tight leading-none text-on-surface max-w-2xl mx-auto">
            Stop guessing where <span className="bg-gradient-to-r from-primary via-[#dcdbff] to-primary bg-clip-text text-transparent">your day went</span>
          </h1>
          
          <p className="text-base sm:text-lg text-outline max-w-lg mx-auto font-medium leading-relaxed">
            Aika is a super simple timer that helps you focus on what matters, organize your projects, and automatically see how you spend your time.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/auth">
              <button className="rounded-full font-bold bg-primary text-on-primary hover:bg-primary/95 px-8 py-4 text-body-lg shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
                Start Tracking Free <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </section>
            
        {/* HOW IT WORKS SECTION */}
        <section className="w-full py-12 border-t border-outline-variant/10">
          <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-center mb-10">
            How simple is it?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1 */}
            <div className="bg-surface-container-low/40 border border-outline-variant/30 rounded-xl p-6 space-y-4 hover:border-outline-variant/80 transition-colors dark:bg-[#131315]/40 dark:border-outline-variant/40">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Play className="h-5 w-5 fill-current" />
              </div>
              <h3 className="text-lg font-bold text-on-surface">1. Type & Start</h3>
              <p className="text-body-sm text-outline leading-relaxed">
                Just type what you're doing and press the Play button. No confusing setup, no annoying spreadsheets.
              </p>
            </div>
            {/* Step 2 */}
            <div className="bg-surface-container-low/40 border border-outline-variant/30 rounded-xl p-6 space-y-4 hover:border-outline-variant/80 transition-colors dark:bg-[#131315]/40 dark:border-outline-variant/40">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-on-surface">2. See Your Progress</h3>
              <p className="text-body-sm text-outline leading-relaxed">
                Your logs automatically turn into neat, colorful charts. See exactly how many hours went to study or hobbies.
              </p>
            </div>
            {/* Step 3 */}
            <div className="bg-surface-container-low/40 border border-outline-variant/30 rounded-xl p-6 space-y-4 hover:border-outline-variant/80 transition-colors dark:bg-[#131315]/40 dark:border-outline-variant/40">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-on-surface">3. Work Together</h3>
              <p className="text-body-sm text-outline leading-relaxed">
                Working on school group projects? Invite classmates to your space and keep track of tasks as a team.
              </p>
            </div>
          </div>
        </section>
        {/* KEYBOARD SHORTCUTS INTERACTIVE DEMO */}
        <section className="w-full py-16 border-t border-outline-variant/10 flex flex-col items-center">
          <div className="max-w-md text-center space-y-3 mb-8">
            <h2 className="text-2xl font-heading font-black tracking-tight">
              Control everything with hotkeys
            </h2>
            <p className="text-body-sm text-outline">
              Press these keys on your keyboard right now to see them light up, or hover over them!
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-sm w-full">
            {/* Shortcut T */}
            <div className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
              activeKeys["t"] 
                ? "bg-primary/25 border-primary shadow-lg scale-95" 
                : "bg-surface-container-low/60 border-outline-variant/40 dark:bg-[#131315]/60 dark:border-outline-variant hover:border-primary/50"
            }`}>
              <kbd className="h-10 w-10 bg-surface-container rounded-lg border border-outline-variant flex items-center justify-center font-mono-timer text-lg font-bold text-on-surface">
                T
              </kbd>
              <span className="text-[10px] font-bold text-outline uppercase">Toggle Timer</span>
            </div>
            {/* Shortcut N */}
            <div className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
              activeKeys["n"] 
                ? "bg-primary/25 border-primary shadow-lg scale-95" 
                : "bg-surface-container-low/60 border-outline-variant/40 dark:bg-[#131315]/60 dark:border-outline-variant hover:border-primary/50"
            }`}>
              <kbd className="h-10 w-10 bg-surface-container rounded-lg border border-outline-variant flex items-center justify-center font-mono-timer text-lg font-bold text-on-surface">
                N
              </kbd>
              <span className="text-[10px] font-bold text-outline uppercase">New manual Log</span>
            </div>
            {/* Shortcut / */}
            <div className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
              activeKeys["/"] 
                ? "bg-primary/25 border-primary shadow-lg scale-95" 
                : "bg-surface-container-low/60 border-outline-variant/40 dark:bg-[#131315]/60 dark:border-outline-variant hover:border-primary/50"
            }`}>
              <kbd className="h-10 w-10 bg-surface-container rounded-lg border border-outline-variant flex items-center justify-center font-mono-timer text-lg font-bold text-on-surface">
                /
              </kbd>
              <span className="text-[10px] font-bold text-outline uppercase">Quick Search</span>
            </div>
          </div>
        </section>
        {/* BOTTOM CALL TO ACTION */}
        <section className="w-full py-16 border-t border-outline-variant/10 text-center space-y-6">
          <h2 className="text-3xl font-heading font-black tracking-tight">Ready to master your schedule?</h2>
          <p className="text-body-sm text-outline max-w-sm mx-auto">
            Get started in under 30 seconds. No credit card required, completely free.
          </p>
          <Link href="/auth">
            <button className="rounded-full font-bold bg-primary text-on-primary hover:bg-primary/95 px-8 py-3.5 text-body-md shadow-lg transition-all active:scale-[0.98]">
              Create Your Free Account
            </button>
          </Link>
        </section>
      </main>
      {/* Footer */}
      <footer className="w-full max-w-6xl py-8 px-6 border-t border-outline-variant/10 mt-auto flex flex-col sm:flex-row items-center justify-between text-xs text-outline gap-4">
        <span>© {new Date().getFullYear()} Aika. All rights reserved.</span>
        <div className="flex gap-4">
          <span className="hover:text-on-surface cursor-pointer">Privacy</span>
          <span className="hover:text-on-surface cursor-pointer">Terms</span>
        </div>
      </footer>
    </div>
  );
}
