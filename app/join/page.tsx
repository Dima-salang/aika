"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldAlert, CheckCircle2, UserPlus, LogIn, Sparkles, Sun, Moon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: tokenInfo, isLoading: tokenLoading, error: tokenError } = trpc.validateJoinToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const applyToken = trpc.applyJoinToken.useMutation();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
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

  const handleAction = async () => {
    if (!tokenInfo || !session?.user?.id) return;
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const res = await applyToken.mutateAsync({
        token,
        userId: session.user.id,
      });

      if (res.success) {
        if (tokenInfo.autoJoin) {
          setSuccessMsg(`Welcome aboard! You have successfully joined "${tokenInfo.organizationName}".`);
          setTimeout(() => {
            router.push("/");
          }, 3000);
        } else {
          setSuccessMsg(`Your request to join "${tokenInfo.organizationName}" has been submitted for admin approval.`);
          setTimeout(() => {
            router.push("/");
          }, 4000);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An error occurred while processing the join token.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl">
        <CardHeader className="text-center pt-8">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <CardTitle className="text-xl font-bold">Missing Invitation Token</CardTitle>
          <CardDescription className="text-xs">
            A valid onboarding token is required to join an organization. Please request a new invite link from your workspace administrator.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button onClick={() => router.push("/")} variant="outline" className="w-full rounded-xl text-xs font-bold">
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (sessionLoading || tokenLoading) {
    return (
      <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl overflow-hidden">
        <div className="space-y-5 p-8 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex flex-col items-center space-y-3 pb-6 border-b border-zinc-150 dark:border-zinc-800">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
          {/* Content Block Skeleton */}
          <div className="space-y-4 py-2 flex flex-col items-center">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <div className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-100 dark:border-zinc-850 space-y-2.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
          {/* Footer Buttons Skeleton */}
          <div className="space-y-3 pt-5 border-t border-zinc-150 dark:border-zinc-800">
            <Skeleton className="h-10.5 w-full rounded-xl" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </Card>
    );
  }

  if (tokenError || !tokenInfo?.valid) {
    return (
      <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl">
        <CardHeader className="text-center pt-8">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-xl font-bold">Invalid or Expired Link</CardTitle>
          <CardDescription className="text-xs text-red-500/80 mt-1">
            {tokenError?.message || "This invitation link is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-zinc-500 text-center px-6">
          Onboarding links are subject to strict usage limits, time bounds, or manual revocation by organization admins.
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={() => router.push("/")} variant="outline" className="w-full rounded-xl text-xs font-bold">
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Not logged in flow
  if (!session?.user) {
    const loginRedirectUrl = `/auth?redirect=${encodeURIComponent(`/join?token=${token}`)}`;
    return (
      <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 text-center pb-6 pt-8 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-850">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">You've Been Invited!</CardTitle>
          <CardDescription className="text-xs font-medium text-zinc-550 dark:text-zinc-400">
            Join <span className="font-extrabold text-primary">{tokenInfo.organizationName}</span>
            {tokenInfo.teamName && (
              <>
                {" "}and squad <span className="font-extrabold text-secondary">{tokenInfo.teamName}</span>
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-6 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            To accept this invitation and begin tracking time and collaborating on tasks, please create an account or sign in to your existing Aika profile.
          </p>
        </CardContent>

        <CardFooter className="flex-col gap-2 p-6 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/10">
          <Button
            onClick={() => router.push(loginRedirectUrl)}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl font-bold text-xs h-10.5 shadow-md flex items-center justify-center gap-1.5"
          >
            <LogIn className="h-4 w-4" /> Sign In / Register
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="ghost"
            className="w-full text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl font-medium"
          >
            Decline Invitation
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Logged in flow
  return (
    <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="space-y-1 text-center pb-6 pt-8 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-850">
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
          <UserPlus className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Accept Invitation</CardTitle>
        <CardDescription className="text-xs font-medium text-zinc-550 dark:text-zinc-400">
          Ready to join <span className="font-extrabold text-primary">{tokenInfo.organizationName}</span>
          {tokenInfo.teamName && (
            <>
              {" "}and squad <span className="font-extrabold text-secondary">{tokenInfo.teamName}</span>
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {errorMsg && (
          <Alert variant="destructive" className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <AlertTitle className="font-bold text-xs">Error</AlertTitle>
            <AlertDescription className="text-[11px] font-medium">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <div className="space-y-4">
            <Alert className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 text-green-650 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <AlertTitle className="font-bold text-xs">Success</AlertTitle>
              <AlertDescription className="text-[11px] font-medium">{successMsg}</AlertDescription>
            </Alert>
            <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs text-zinc-550 dark:text-zinc-400 font-medium">Redirecting to Aika workspace...</span>
            </div>
          </div>
        )}

        {!successMsg && (
          <div className="space-y-4 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              You are logged in as <span className="font-bold text-zinc-800 dark:text-zinc-200">{session.user.email}</span>.
            </p>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-100 dark:border-zinc-850 text-[11px] text-left text-zinc-500 dark:text-zinc-400 space-y-1">
              <span className="font-bold uppercase tracking-wider block text-[9px] text-outline mb-1">Onboarding Details</span>
              <div>• Workspace: {tokenInfo.organizationName}</div>
              {tokenInfo.teamName && <div>• Assigned Team: {tokenInfo.teamName}</div>}
              <div>• Join Type: {tokenInfo.autoJoin ? "Automatic (Immediate Access)" : "Requires Approval"}</div>
            </div>
          </div>
        )}
      </CardContent>

      {!successMsg && (
        <CardFooter className="flex-col gap-2 p-6 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/10">
          <Button
            onClick={handleAction}
            disabled={isProcessing}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl font-bold text-xs h-10.5 shadow-md flex items-center justify-center gap-1.5"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing request...
              </>
            ) : tokenInfo.autoJoin ? (
              "Accept & Join Instantly"
            ) : (
              "Submit Request to Join"
            )}
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="ghost"
            className="w-full text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl font-medium"
          >
            Decline Invitation
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default function JoinPage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
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

        <Suspense fallback={
          <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl p-8 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Verifying secure invitation credentials...</p>
          </Card>
        }>
          <JoinContent />
        </Suspense>
      </div>
    </div>
  );
}
