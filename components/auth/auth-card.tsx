"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";
import { AlertCircle, Loader2, Key, Mail, UserCircle, Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // UI States
  const [error, setError] = useState<string | null>(null);
  const [errorDesc, setErrorDesc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const descParam = searchParams.get("description") || searchParams.get("error_description");
    if (errorParam) {
      let readableError = errorParam;
      if (
        errorParam.toLowerCase().includes("cancel") || 
        errorParam === "AccessDenied" || 
        errorParam === "access_denied"
      ) {
        readableError = "Authentication cancelled.";
      } else if (errorParam === "Configuration") {
        readableError = "Authentication provider configuration error.";
      } else {
        readableError = errorParam.replace(/_/g, " ");
        readableError = readableError.charAt(0).toUpperCase() + readableError.slice(1);
      }
      
      setError(readableError);
      
      let readableDesc = descParam ? decodeURIComponent(descParam).replace(/\+/g, " ") : "";
      if (!readableDesc && readableError.includes("cancelled")) {
        readableDesc = "The sign-in request was cancelled. Please try again.";
      }
      if (readableDesc) {
        setErrorDesc(readableDesc);
      }

      toast.error(readableError, {
        description: readableDesc || "Please try another method or credentials.",
        duration: 6000,
      });

      const newUrl = window.location.pathname + (redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorDesc(null);
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
    setErrorDesc(null);
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
    <div className="w-full max-w-xl space-y-8 px-4 sm:px-0">
      <div className="space-y-3 text-center sm:text-left">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-on-surface select-none">
          {mode === "signin" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
          {mode === "signin"
            ? "Sign in to log your study/work hours and track tasks."
            : "Sign up now to start tracking your time."}
        </p>
      </div>
      
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive" className="rounded-xl border border-error/20 bg-error/5 text-error flex items-start gap-3 p-4 animate-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <AlertTitle className="font-extrabold text-xs tracking-wider uppercase mb-0.5">{error}</AlertTitle>
              {errorDesc ? (
                <AlertDescription className="text-xs font-medium leading-relaxed opacity-90">{errorDesc}</AlertDescription>
              ) : (
                <AlertDescription className="text-xs font-medium leading-relaxed opacity-90">Please try signing in again using your credentials or a social provider.</AlertDescription>
              )}
            </div>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "signup" && (
            <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
              <Label htmlFor="name" className="text-xs uppercase tracking-wider font-extrabold text-on-surface-variant/80 flex items-center gap-2">
                <UserCircle className="h-4.5 w-4.5 text-outline" /> Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. John Doe"
                className="bg-transparent border-0 border-b border-outline-variant/60 hover:border-on-surface/50 text-sm h-12 focus-visible:border-primary focus-visible:ring-0 placeholder:text-on-surface-variant/40 px-0 transition-all duration-300 ease-out outline-none focus:outline-none"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-wider font-extrabold text-on-surface-variant/80 flex items-center gap-2">
              <Mail className="h-4.5 w-4.5 text-outline" /> Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="bg-transparent border-0 border-b border-outline-variant/60 hover:border-on-surface/50 text-sm h-12 focus-visible:border-primary focus-visible:ring-0 placeholder:text-on-surface-variant/40 px-0 transition-all duration-300 ease-out outline-none focus:outline-none"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider font-extrabold text-on-surface-variant/80 flex items-center gap-2">
              <Key className="h-4.5 w-4.5 text-outline" /> Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="bg-transparent border-0 border-b border-outline-variant/60 hover:border-on-surface/50 text-sm h-12 pr-12 focus-visible:border-primary focus-visible:ring-0 placeholder:text-on-surface-variant/40 px-0 transition-all duration-300 ease-out outline-none focus:outline-none"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors duration-200 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/95 hover:-translate-y-[1px] hover:shadow-xl hover:shadow-primary/10 active:translate-y-0 active:scale-[0.98] text-on-primary rounded-xl font-bold text-sm h-12 shadow-lg shadow-primary/20 transition-all duration-300 ease-out cursor-pointer mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Please wait...
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Register"
            )}
          </Button>
        </form>

        <div className="relative flex py-3 items-center">
          <div className="flex-grow border-t border-outline-variant/10"></div>
          <span className="flex-shrink mx-4 text-[10px] text-outline uppercase tracking-widest font-black">
            or continue with
          </span>
          <div className="flex-grow border-t border-outline-variant/10"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => handleSocialSignIn("google")}
            className="rounded-xl border border-outline-variant/30 text-sm font-bold bg-surface-container-high/60 hover:bg-surface-container-highest/90 dark:bg-[#1a1a1f]/60 dark:hover:bg-[#25252b]/90 hover:border-outline hover:-translate-y-[1px] hover:shadow-md text-on-surface transition-all duration-300 ease-out active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer h-12"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.96 1 12 1 7.35 1 3.4 3.65 1.48 7.5l3.84 2.98C6.24 7.22 8.88 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.8-.07-1.56-.2-2.3H12v4.51h6.43c-.28 1.44-1.1 2.67-2.33 3.5l3.6 2.8c2.1-1.94 3.3-4.8 3.3-8.51z"
              />
              <path
                fill="#FBBC05"
                d="M5.32 10.48c-.24-.72-.38-1.48-.38-2.28s.14-1.56.38-2.28L1.48 2.94C.54 4.8 0 6.88 0 9s.54 4.2 1.48 6.06l3.84-3.08z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.6-2.8c-1 .67-2.28 1.07-3.6 1.07-3.12 0-5.76-2.18-6.72-5.46L1.2 15.98C3.12 19.85 7.08 23 12 23z"
              />
            </svg>
            Google
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSocialSignIn("github")}
            className="rounded-xl border border-outline-variant/30 text-sm font-bold bg-surface-container-high/60 hover:bg-surface-container-highest/90 dark:bg-[#1a1a1f]/60 dark:hover:bg-[#25252b]/90 hover:border-outline hover:-translate-y-[1px] hover:shadow-md text-on-surface transition-all duration-300 ease-out active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer h-12"
          >
            <svg className="h-5 w-5 shrink-0 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.646.64.699 1.026 1.592 1.026 2.683 0 3.842-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            GitHub
          </Button>
        </div>
      </div>
      
      <div className="pt-6 text-center sm:text-left border-t border-outline-variant/10">
        <p className="text-sm text-outline font-medium">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setErrorDesc(null);
            }}
            className="font-extrabold text-on-surface underline hover:no-underline transition-all cursor-pointer"
          >
            {mode === "signin" ? "Register here" : "Sign in here"}
          </button>
        </p>
      </div>
    </div>
  );
}
