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
    <Card className="w-full max-w-md overflow-hidden border border-outline-variant/10 bg-surface-container-lowest/60 dark:bg-[#131315]/60 backdrop-blur-md shadow-2xl rounded-2xl transition-all duration-300">
      <CardHeader className="space-y-1 text-center pb-6 pt-8">
        <CardTitle className="text-2xl font-bold tracking-tight text-on-surface">
          {mode === "signin" ? "Welcome Back!" : "Create an Account"}
        </CardTitle>
        <CardDescription className="text-xs text-outline font-medium">
          {mode === "signin"
            ? "Sign in to view and log your work hours"
            : "Sign up now to start tracking your time"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 px-6 pb-6">
        {error && (
          <Alert variant="destructive" className="rounded-xl border border-error/25 bg-error/10 text-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertTitle className="font-bold text-xs">Error</AlertTitle>
            <AlertDescription className="text-[11px] font-medium">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <UserCircle className="h-4 w-4 text-outline" /> Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. John Doe"
                className="bg-surface-container-low/60 border-outline-variant/15 text-on-surface rounded-xl text-xs focus:border-primary/50 focus:ring-0 placeholder:text-outline/40 dark:bg-[#0a0a0c]/60"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-outline" /> Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="bg-surface-container-low/60 border-outline-variant/15 text-on-surface rounded-xl text-xs focus:border-primary/50 focus:ring-0 placeholder:text-outline/40 dark:bg-[#0a0a0c]/60"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <Key className="h-4 w-4 text-outline" /> Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-surface-container-low/60 border-outline-variant/15 text-on-surface rounded-xl text-xs focus:border-primary/50 focus:ring-0 placeholder:text-outline/40 dark:bg-[#0a0a0c]/60"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/95 text-on-primary rounded-xl font-bold text-xs h-10.5 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
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
          <div className="flex-grow border-t border-outline-variant/10"></div>
          <span className="flex-shrink mx-4 text-[10px] text-outline uppercase tracking-widest font-bold">
            or continue with
          </span>
          <div className="flex-grow border-t border-outline-variant/10"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => handleSocialSignIn("google")}
            className="rounded-xl border border-outline-variant/10 text-xs font-bold bg-surface-container-low/40 hover:bg-surface-container-low/80 dark:bg-[#131315]/40 dark:hover:bg-[#131315]/80 text-on-surface transition-all active:scale-[0.98]"
          >
            Google
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSocialSignIn("github")}
            className="rounded-xl border border-outline-variant/10 text-xs font-bold bg-surface-container-low/40 hover:bg-surface-container-low/80 dark:bg-[#131315]/40 dark:hover:bg-[#131315]/80 text-on-surface transition-all active:scale-[0.98]"
          >
            GitHub
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="justify-center border-t border-outline-variant/10 bg-surface-container-low/20 dark:bg-[#131315]/20 p-4">
        <p className="text-xs text-outline font-medium">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="font-bold text-on-surface underline hover:no-underline transition-all"
          >
            {mode === "signin" ? "Register here" : "Sign in here"}
          </button>
        </p>
      </CardFooter>
    </Card>
  );
}
