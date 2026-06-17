"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { calculateDurationHours } from "@/utils/time";
import { Play, Clock, TrendingUp, Users, CheckCircle, Zap, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

export function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative w-full bg-gradient-to-b from-background via-background to-surface-container/20 text-foreground flex flex-col items-center overflow-x-hidden font-sans">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-[100px]"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        />
        <div
          className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-blue-300/5 blur-[120px]"
          style={{ transform: `translateY(${scrollY * -0.2}px)` }}
        />
        <div
          className="absolute -bottom-32 left-1/2 w-72 h-72 rounded-full bg-slate-400/5 blur-[100px]"
          style={{ transform: `translateY(${scrollY * 0.25}px)` }}
        />
      </div>

      {/* Header - Linear Style */}
      <header className="w-full sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-on-surface/5">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-7 w-7 bg-on-surface rounded-lg flex items-center justify-center font-black text-background text-sm group-hover:scale-110 transition-transform">
              A
            </div>
            <span className="font-black text-base text-on-surface group-hover:opacity-80 transition-opacity">Aika</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth">
              <button className="text-sm text-on-surface/70 hover:text-on-surface transition-colors">Sign In</button>
            </Link>
            <Link href="/auth">
              <button className="text-sm px-4 py-2 bg-on-surface text-background rounded-lg font-semibold hover:opacity-90 transition-opacity">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex flex-col items-center z-10 relative">
        {/* Massive Aika Hero */}
        <div className="w-full px-6 pt-12 pb-8 overflow-hidden">
          <div className="relative h-[500px] sm:h-[600px] flex items-center justify-center">
            {/* Animated gradient background element */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: "radial-gradient(circle at center, rgba(73, 75, 214, 0.2) 0%, transparent 100%)",
                transform: `scale(${1 + scrollY * 0.0005})`,
              }}
            />
            
            {/* Main hero text - Ultra large and bold */}
            <div className="relative text-center space-y-6 max-w-5xl">
              <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black leading-none text-on-surface tracking-tighter">
                <span className="inline-block">Aika</span>
              </h1>
              
              <div className="h-1 w-16 bg-gradient-to-r from-primary to-on-surface/30 mx-auto rounded-full" />
              
              <p className="text-xl sm:text-2xl text-on-surface/70 max-w-xl mx-auto font-light leading-relaxed">
                Time tracking that gets out of your way
              </p>

              <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <button className="group px-8 py-3 bg-on-surface text-background font-semibold rounded-lg hover:opacity-90 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 justify-center">
                    Start Tracking <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </Link>
                <button className="px-8 py-3 border border-on-surface/30 text-on-surface font-semibold rounded-lg hover:border-on-surface/60 hover:bg-on-surface/5 transition-all hover:scale-105 active:scale-95">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section - Glassmorphism */}
        <section className="w-full max-w-6xl px-6 py-24 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-on-surface mb-4">
              Built for focus
            </h2>
            <p className="text-lg text-on-surface/60">
              Everything you need to track time without the complexity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: Zap,
                title: "Instant Tracking",
                description: "Type and press Enter. That's it.",
              },
              {
                icon: Clock,
                title: "Time Awareness",
                description: "Understand where your hours actually go.",
              },
              {
                icon: TrendingUp,
                title: "Visual Reports",
                description: "Beautiful charts and breakdowns of your time.",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Track projects and time with your team.",
              },
              {
                icon: CheckCircle,
                title: "Streak Motivation",
                description: "Stay consistent with achievement tracking.",
              },
              {
                icon: Sparkles,
                title: "Smart Insights",
                description: "AI-powered productivity recommendations.",
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setActiveFeature(i)}
                  onMouseLeave={() => setActiveFeature(-1)}
                  className="group relative bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-300 hover:shadow-lg cursor-pointer overflow-hidden"
                >
                  {/* Glass shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                  
                  <div className="relative space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-on-surface/10 flex items-center justify-center group-hover:bg-on-surface/20 transition-colors">
                      <Icon className="w-5 h-5 text-on-surface" />
                    </div>
                    <h3 className="font-bold text-on-surface">{feature.title}</h3>
                    <p className="text-sm text-on-surface/70 group-hover:text-on-surface/80 transition-colors">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works - Simple Linear Style */}
        <section className="w-full max-w-6xl px-6 py-24 mx-auto border-t border-on-surface/10">
          <h2 className="text-4xl font-black text-on-surface mb-16 text-center">
            Simple workflow
          </h2>

          <div className="space-y-8">
            {[
              {
                number: "01",
                title: "Start",
                description: "Type what you're working on and press Enter. Instant tracking begins.",
              },
              {
                number: "02",
                title: "Track",
                description: "Watch your time accumulate. Pause or stop whenever you're ready.",
              },
              {
                number: "03",
                title: "Analyze",
                description: "View beautiful visualizations of where your time went each week.",
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-8 md:gap-12">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-2 border-on-surface/30 flex items-center justify-center font-black text-on-surface/60">
                    {step.number}
                  </div>
                  {i < 2 && <div className="w-1 h-24 bg-on-surface/10 mt-4" />}
                </div>
                <div className="pb-8 pt-1">
                  <h3 className="text-2xl font-bold text-on-surface mb-3">{step.title}</h3>
                  <p className="text-lg text-on-surface/60 max-w-md">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Premium CTA with Glassmorphism */}
        <section className="w-full max-w-6xl px-6 py-24 mx-auto">
          <div className="relative rounded-2xl overflow-hidden">
            {/* Glassmorphism background */}
            <div className="absolute inset-0 bg-white/20 dark:bg-white/5 backdrop-blur-3xl border border-white/30 dark:border-white/10" />
            
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-on-surface/5 via-transparent to-transparent" />
            
            <div className="relative p-12 md:p-16 text-center space-y-8 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-black text-on-surface leading-tight">
                Ready to understand your time?
              </h2>
              
              <p className="text-xl text-on-surface/70">
                Join creators and professionals who've reclaimed hours from their week. Start free forever.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="/auth">
                  <button className="group px-8 py-4 bg-on-surface text-background font-bold rounded-lg hover:opacity-90 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 justify-center">
                    Start Tracking Now <ArrowUpRight className="w-4 h-4" />
                  </button>
                </Link>
                <button className="px-8 py-4 border border-on-surface/30 text-on-surface font-semibold rounded-lg hover:border-on-surface/60 hover:bg-on-surface/5 transition-all">
                  Schedule Demo
                </button>
              </div>

              <p className="text-sm text-on-surface/60">
                Free forever • No credit card required • All features included
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Linear Style */}
      <footer className="w-full border-t border-on-surface/10 bg-gradient-to-b from-transparent to-on-surface/5">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-sm font-bold text-on-surface/80 mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-sm text-on-surface/60">
                <li className="hover:text-on-surface transition-colors cursor-pointer">Features</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Pricing</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Security</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface/80 mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2 text-sm text-on-surface/60">
                <li className="hover:text-on-surface transition-colors cursor-pointer">About</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Blog</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Careers</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface/80 mb-4 uppercase tracking-wider">Resources</h4>
              <ul className="space-y-2 text-sm text-on-surface/60">
                <li className="hover:text-on-surface transition-colors cursor-pointer">Docs</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">API</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Support</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface/80 mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm text-on-surface/60">
                <li className="hover:text-on-surface transition-colors cursor-pointer">Privacy</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Terms</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Cookies</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-on-surface/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-on-surface/50">
            <span>© {new Date().getFullYear()} Aika. All rights reserved.</span>
            <div className="flex gap-6">
              <span className="hover:text-on-surface transition-colors cursor-pointer">Twitter</span>
              <span className="hover:text-on-surface transition-colors cursor-pointer">GitHub</span>
              <span className="hover:text-on-surface transition-colors cursor-pointer">Discord</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
