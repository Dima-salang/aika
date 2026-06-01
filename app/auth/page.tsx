import React from "react";
import { AuthCard } from "@/components/auth/auth-card";
import Image from "next/image";

export default function AuthPage() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-black p-4 md:p-8 overflow-hidden">
      {/* Background visual graphics */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-400/20 blur-[120px] dark:bg-violet-900/10 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-400/20 blur-[120px] dark:bg-indigo-900/10 pointer-events-none" />

      <div className="z-10 w-full flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <Image
            className="dark:invert mb-2 animate-pulse"
            src="/next.svg"
            alt="Aika logo"
            width={120}
            height={24}
            priority
          />
          <p className="text-sm font-semibold tracking-widest text-zinc-400 dark:text-zinc-600 uppercase">
            Time & Task Orchestration
          </p>
        </div>

        <AuthCard />
      </div>
    </div>
  );
}
