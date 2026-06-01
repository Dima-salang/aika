"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";
import { AlertCircle, Loader2 } from "lucide-react";

export function AuthCard() {
  const router = useRouter();
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
            callbackURL: "/",
          },
          {
            onRequest: () => setLoading(true),
            onSuccess: () => {
              setLoading(false);
              router.push("/");
            },
            onError: (ctx) => {
              setLoading(false);
              setError(ctx.error.message || "An error occurred during registration.");
            },
          }
        );
      } else {
        await authClient.signIn.email(
          {
            email,
            password,
            callbackURL: "/",
          },
          {
            onRequest: () => setLoading(true),
            onSuccess: () => {
              setLoading(false);
              router.push("/");
            },
            onError: (ctx) => {
              setLoading(false);
              setError(ctx.error.message || "Invalid credentials. Please try again.");
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
        callbackURL: "/",
      });
    } catch (err: any) {
      setError(err?.message || `Failed to sign in with ${provider}.`);
    }
  };

  return (
    <Card className="w-full max-w-md overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-zinc-500/10 dark:hover:shadow-zinc-950/50">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-extrabold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Create an account"}
        </CardTitle>
        <CardDescription>
          {mode === "signin"
            ? "Enter your credentials to access your account"
            : "Sign up now to get started with Aika"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="animate-in fade-in zoom-in duration-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Register"
            )}
          </Button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
          <span className="flex-shrink mx-4 text-xs text-zinc-400 uppercase tracking-widest">
            or continue with
          </span>
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => handleSocialSignIn("google")} className="gap-2">
            <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.19-2.77-6.19-6.19 0-3.42 2.78-6.19 6.19-6.19 1.583 0 3.018.59 4.114 1.564l3.18-3.18C19.14 1.83 15.9 0 12.24 0c-6.627 0-12 5.373-12 12s5.373 12 12 12c6.233 0 11.537-4.499 11.96-10.428h-11.96z"/>
            </svg>
            Google
          </Button>
          <Button variant="outline" onClick={() => handleSocialSignIn("github")} className="gap-2">
            <svg className="h-4 w-4 text-zinc-800 dark:text-zinc-200" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </Button>
        </div>
      </CardContent>
      <CardFooter className="justify-center border-t border-zinc-100 bg-zinc-50/50 py-4 dark:border-zinc-900 dark:bg-zinc-900/10">
        <p className="text-sm text-zinc-500">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="font-semibold text-black dark:text-white underline hover:no-underline transition-all"
          >
            {mode === "signin" ? "Register here" : "Sign in here"}
          </button>
        </p>
      </CardFooter>
    </Card>
  );
}
