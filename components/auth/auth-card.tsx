"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";
import { AlertCircle, Loader2, Key, Mail, UserCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // UI States
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        await authClient.signUp.email(
          {
            email,
            password,
            name,
            callbackURL: redirect,
          },
          {
            onRequest: () => setLoading(true),
            onSuccess: () => {
              setLoading(false);
              router.push(redirect);
            },
            onError: (ctx) => {
              setLoading(false);
              setError(ctx.error.message || "Could not register. Please try again.");
            },
          }
        );
      } else {
        await authClient.signIn.email(
          {
            email,
            password,
            callbackURL: redirect,
          },
          {
            onRequest: () => setLoading(true),
            onSuccess: () => {
              setLoading(false);
              router.push(redirect);
            },
            onError: (ctx) => {
              setLoading(false);
              setError(ctx.error.message || "Incorrect email or password.");
            },
          }
        );
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "An unexpected error occurred.");
    }
  };

  const handleSocialSignIn = async (provider: "github" | "google") => {
    setError(null);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: redirect,
      });
    } catch (err: any) {
      setError(err?.message || `Failed to sign in with ${provider}.`);
    }
  };


  return (
    <Card className="w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl transition-all duration-300">
      <CardHeader className="space-y-1 text-center pb-6 pt-8">
        <CardTitle className="text-2xl font-bold tracking-tight">
          {mode === "signin" ? "Welcome Back!" : "Create an Account"}
        </CardTitle>
        <CardDescription className="text-xs text-zinc-550 dark:text-zinc-400 font-medium">
          {mode === "signin"
            ? "Sign in to view and log your work hours"
            : "Sign up now to start tracking your time"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 px-6 pb-6">
        {error && (
          <Alert variant="destructive" className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertTitle className="font-bold text-xs">Error</AlertTitle>
            <AlertDescription className="text-[11px] font-medium">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <UserCircle className="h-4 w-4 text-zinc-400" /> Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. John Doe"
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl text-xs"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-zinc-400" /> Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl text-xs"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Key className="h-4 w-4 text-zinc-400" /> Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl text-xs"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <Button
            type="submit"
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl font-bold text-xs h-10.5 shadow-md shadow-zinc-900/10 dark:shadow-zinc-50/5 transition-all"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait...
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Register"
            )}
          </Button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-850"></div>
          <span className="flex-shrink mx-4 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
            or continue with
          </span>
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-850"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => handleSocialSignIn("google")}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold bg-white dark:bg-zinc-900 hover:bg-zinc-50 transition-all"
          >
            Google
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSocialSignIn("github")}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold bg-white dark:bg-zinc-900 hover:bg-zinc-50 transition-all"
          >
            GitHub
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="justify-center border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/10 p-4">
        <p className="text-xs text-zinc-500 font-medium">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="font-bold text-zinc-950 dark:text-zinc-50 underline hover:no-underline transition-all"
          >
            {mode === "signin" ? "Register here" : "Sign in here"}
          </button>
        </p>
      </CardFooter>
    </Card>
  );
}
