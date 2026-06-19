"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { formatErrorMessage } from "@/utils/file";
import { toast } from "sonner";
import { ImageViewer } from "@/components/ui-components/image-viewer";
import { AuthProvider } from "@/components/providers/auth-provider";

// Monkey patch toast.error on the client side to format all error messages automatically
if (typeof window !== "undefined") {
  const originalError = toast.error;
  toast.error = (message: any, options: any) => {
    return originalError(formatErrorMessage(message), options);
  };
}

// Custom tRPC link to catch all server/validation errors and format them to be human-readable before throwing
const errorFormattingLink: TRPCLink<any> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      return next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          if (err && typeof err === "object") {
            err.message = formatErrorMessage(err);
          }
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
    });
  };
};

export function Providers({ children }: { children: React.ReactNode }) {
  // Prevent QueryClient and trpcClient from being re-created on every render
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // cache data as fresh for 5 mins
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        errorFormattingLink,
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <ImageViewer />
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
