"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { calculateDurationHours } from "@/utils/time";
import { Play, Zap, Gauge, Sparkles, TrendingUp, Users2, Flame, ArrowRight, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground flex flex-col items-center overflow-x-hidden font-sans">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        />
        <div
          className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-15"
          style={{
            background: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
            transform: `translateY(${scrollY * -0.3}px)`,
          }}
        />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(100,116,139,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />
      </div>

      {/* Header - Premium Design */}
      <header className="w-full sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-on-surface/5 transition-all duration-300">
        <div className="w-full max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-lg shadow-lg group-hover:shadow-xl transition-all">
              A
            </div>
            <span className="font-black tracking-tight text-lg text-on-surface group-hover:text-primary transition-colors">
              Aika
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <button className="text-sm font-semibold text-on-surface/60 hover:text-on-surface transition-colors duration-300">
                Sign In
              </button>
            </Link>
            <Link href="/auth">
              <button className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-sm px-6 py-2.5 font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl px-6 flex flex-col items-center z-10 relative">
        {/* Hero Section */}
        <section className="w-full pt-24 pb-20 text-center space-y-8 max-w-4xl mx-auto animate-fade-in">
          {/* Badge */}
          <div className="inline-block">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-on-surface/10 bg-on-surface/5 backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5 transition-all duration-300">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-on-surface/80">Introducing Aika 2.0</span>
              <ChevronRight className="w-4 h-4 text-on-surface/40" />
            </div>
          </div>

          {/* Main Headline - Bold & Modern */}
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-7xl font-black leading-[1.1] text-balance">
              <span className="text-on-surface">Track your time,</span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient">
                master your life
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-on-surface/70 max-w-2xl mx-auto font-medium leading-relaxed">
              The beautiful, ultra-fast time tracking app designed for creators, students, and teams. Focus on what matters, not where your time went.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/auth">
              <button className="group relative px-8 py-4 text-lg font-bold text-white rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl overflow-hidden">
                <span className="relative flex items-center gap-2">
                  Start Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </Link>
            <button className="px-8 py-4 text-lg font-bold text-on-surface rounded-full border-2 border-on-surface/20 hover:border-on-surface/50 hover:bg-on-surface/5 transition-all duration-300 hover:scale-105 active:scale-95">
              Watch Demo
            </button>
          </div>
        </section>

        {/* Trust Section */}
        <section className="w-full py-12 border-t border-on-surface/10 text-center">
          <p className="text-sm font-semibold text-on-surface/50 mb-8">TRUSTED BY TEAMS AT</p>
          <div className="flex flex-wrap justify-center items-center gap-8 text-on-surface/40 font-bold text-sm">
            <span>Google</span>
            <span className="text-on-surface/20">•</span>
            <span>Stanford</span>
            <span className="text-on-surface/20">•</span>
            <span>Figma</span>
            <span className="text-on-surface/20">•</span>
            <span>Discord</span>
            <span className="text-on-surface/20">•</span>
            <span>OpenAI</span>
          </div>
        </section>

        {/* Features Grid - Modern Card Design */}
        <section className="w-full py-24">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-4xl sm:text-5xl font-black text-on-surface">
              Everything you need
            </h2>
            <p className="text-lg text-on-surface/60 max-w-2xl mx-auto">
              Packed with powerful features to help you work smarter, not harder
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Type, hit enter, and you're tracking. No friction, no distractions.",
                color: "from-yellow-500 to-orange-500",
              },
              {
                icon: TrendingUp,
                title: "Visual Insights",
                description: "Beautiful charts and breakdowns show exactly where your time goes.",
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: Gauge,
                title: "Smart Analytics",
                description: "AI-powered insights help you understand your productivity patterns.",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Users2,
                title: "Teamwork Made Easy",
                description: "Collaborate with classmates or teammates in shared workspaces.",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: Flame,
                title: "Streak Tracking",
                description: "Stay motivated with productivity streaks and milestone rewards.",
                color: "from-red-500 to-pink-500",
              },
              {
                icon: Play,
                title: "Keyboard Shortcuts",
                description: "Control everything with hotkeys. Press 'T' to toggle, 'N' for new log.",
                color: "from-indigo-500 to-purple-500",
              },
            ].map((feature, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                className="group relative bg-on-surface/[0.02] border border-on-surface/10 rounded-2xl p-8 hover:border-on-surface/30 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                {/* Animated background gradient on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                />

                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="relative">
                  <h3 className="text-xl font-bold text-on-surface mb-3 group-hover:translate-x-1 transition-transform duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-on-surface/60 leading-relaxed group-hover:text-on-surface/70 transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>

                {/* Hover arrow */}
                <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ArrowRight className="w-5 h-5 text-on-surface/20 group-hover:text-primary" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="w-full py-24 border-t border-on-surface/10">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-4xl sm:text-5xl font-black text-on-surface">
              Three steps to mastery
            </h2>
            <p className="text-lg text-on-surface/60 max-w-2xl mx-auto">
              Get started in seconds, not hours
            </p>
          </div>

          <div className="relative">
            {/* Timeline line - hidden on mobile */}
            <div className="hidden md:block absolute top-1/4 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  number: "01",
                  title: "Start Tracking",
                  description: "Type your task and press play. That's it. No complex setup.",
                  icon: Play,
                },
                {
                  number: "02",
                  title: "Organize Automatically",
                  description: "Logs are tagged, categorized, and visualized automatically.",
                  icon: TrendingUp,
                },
                {
                  number: "03",
                  title: "Gain Insights",
                  description: "See beautiful charts and understand your productivity patterns.",
                  icon: Sparkles,
                },
              ].map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="relative">
                    {/* Step number */}
                    <div className="absolute -top-8 left-0 text-6xl font-black text-on-surface/5">
                      {step.number}
                    </div>

                    {/* Card */}
                    <div className="relative pt-8 group cursor-pointer h-full">
                      <div className="flex flex-col items-start gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <Icon className="w-7 h-7" />
                        </div>

                        <div>
                          <h3 className="text-2xl font-bold text-on-surface mb-3">
                            {step.title}
                          </h3>
                          <p className="text-on-surface/60 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {/* Divider between steps */}
                      {i < 2 && (
                        <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-background border-2 border-on-surface/20" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-24 border-t border-on-surface/10">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-12 md:p-20 text-center space-y-8">
            {/* Decorative elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-1/4 w-72 h-72 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                Ready to reclaim your time?
              </h2>
              <p className="text-lg text-white/80 mb-8">
                Join thousands of students and professionals who are tracking their time smarter. No credit card required.
              </p>

              <Link href="/auth">
                <button className="group relative px-10 py-4 text-lg font-bold text-indigo-600 rounded-full bg-white hover:bg-white/95 transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl hover:shadow-3xl">
                  <span className="flex items-center gap-2 justify-center">
                    Start Your Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </Link>

              <p className="text-sm text-white/60 mt-4">
                ✨ Free forever. No credit card needed. Upgrade anytime.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-on-surface/10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-on-surface mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-on-surface/60">
                <li className="hover:text-on-surface transition-colors cursor-pointer">Features</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Pricing</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Security</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-on-surface mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-on-surface/60">
                <li className="hover:text-on-surface transition-colors cursor-pointer">About</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Blog</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Careers</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-on-surface mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-on-surface/60">
                <li className="hover:text-on-surface transition-colors cursor-pointer">Docs</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">API</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Support</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-on-surface mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-on-surface/60">
                <li className="hover:text-on-surface transition-colors cursor-pointer">Privacy</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Terms</li>
                <li className="hover:text-on-surface transition-colors cursor-pointer">Cookies</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-on-surface/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-on-surface/50">
            <span>© {new Date().getFullYear()} Aika. All rights reserved.</span>
            <div className="flex gap-6">
              <span className="hover:text-on-surface transition-colors cursor-pointer">Twitter</span>
              <span className="hover:text-on-surface transition-colors cursor-pointer">GitHub</span>
              <span className="hover:text-on-surface transition-colors cursor-pointer">Discord</span>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS for animations */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
