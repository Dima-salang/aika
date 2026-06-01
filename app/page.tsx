"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession, signOut } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, User, Building2, Calendar, ShieldCheck } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/auth");
        },
      },
    });
  };

  if (isPending) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-zinc-900 dark:text-zinc-50" />
          <p className="text-zinc-500 text-sm font-medium tracking-wide">Syncing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-zinc-50 dark:bg-black overflow-hidden font-sans">
      {/* Visual background details */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-400/10 blur-[130px] dark:bg-emerald-900/5 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-[130px] dark:bg-blue-900/5 pointer-events-none" />

      {/* Header navbar */}
      <header className="z-10 w-full border-b border-zinc-200/50 bg-white/60 backdrop-blur-md dark:border-zinc-800/50 dark:bg-black/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Aika logo"
            width={75}
            height={16}
            priority
          />
          <span className="text-[10px] bg-zinc-100 text-zinc-800 font-extrabold uppercase px-1.5 py-0.5 rounded dark:bg-zinc-800 dark:text-zinc-200">
            v0.1
          </span>
        </div>

        {session ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {session.user.name}
              </span>
              <span className="text-xs text-zinc-400">
                {session.user.email}
              </span>
            </div>
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name}
                className="h-9 w-9 rounded-full ring-2 ring-zinc-200/80 dark:ring-zinc-800"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-sm uppercase ring-2 ring-zinc-200/80 dark:ring-zinc-800">
                {session.user.name.charAt(0)}
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
              <LogOut className="h-4 w-4 text-zinc-500 hover:text-red-500 transition-colors" />
            </Button>
          </div>
        ) : (
          <Link href="/auth">
            <Button size="sm">Sign In</Button>
          </Link>
        )}
      </header>

      {/* Main dashboard content */}
      <main className="z-10 flex-1 w-full max-w-5xl mx-auto px-6 py-12 flex flex-col justify-center items-center">
        {session ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* User Profile Card */}
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-500" />
                  Your Profile
                </CardTitle>
                <CardDescription>
                  Your account particulars synced through Better Auth.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name}
                      className="h-16 w-16 rounded-full"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xl uppercase">
                      {session.user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {session.user.name}
                    </h4>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {session.user.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                      User ID
                    </span>
                    <p className="text-sm font-mono truncate bg-zinc-100 dark:bg-zinc-900 p-2 rounded text-zinc-700 dark:text-zinc-300">
                      {session.user.id}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                      Email Verified
                    </span>
                    <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4" />
                      {session.user.emailVerified ? "Yes" : "No"}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-zinc-100/50 dark:border-zinc-800/50 pt-4 flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Created {new Date(session.user.createdAt).toLocaleDateString()}</span>
                </div>
              </CardFooter>
            </Card>

            {/* Tenant details card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-500" />
                  Organization
                </CardTitle>
                <CardDescription>
                  Your current tenant domain space.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <p className="text-zinc-500 text-sm mb-4">
                    Ready to build multi-tenant teams? Leverage Better Auth Organizations plugin.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Organizations
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        ) : (
          <div className="max-w-2xl text-center space-y-8 py-16 animate-in fade-in zoom-in duration-300">
            <h1 className="text-5xl font-black tracking-tight leading-none text-zinc-900 dark:text-white sm:text-6xl bg-gradient-to-r from-zinc-950 via-zinc-700 to-black bg-clip-text text-transparent dark:from-zinc-100 dark:via-zinc-300 dark:to-white">
              Aika Time & Tasks
            </h1>
            <p className="text-lg text-zinc-500 max-w-lg mx-auto">
              A beautifully type-safe, elegant time logging and team management platform built on Next.js 16 and fully secured with Better Auth.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/auth">
                <Button size="lg" className="rounded-full shadow-lg">
                  Get Started
                </Button>
              </Link>
              <a href="https://github.com/drizzle-team/drizzle-orm" target="_blank" rel="noreferrer">
                <Button variant="outline" size="lg" className="rounded-full">
                  Learn Drizzle
                </Button>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
