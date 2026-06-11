import { initTRPC } from "@trpc/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

import { cache } from "react";

// Memoize session resolution per-request to deduplicate DB queries
const getCachedSession = cache(async (headersList: Headers) => {
  console.time("[tRPC Session Cache] DB Lookup");
  const session = await auth.api.getSession({
    headers: headersList,
  });
  console.timeEnd("[tRPC Session Cache] DB Lookup");
  return session;
});

// Define the tRPC request context
export const createContext = async () => {
  const reqHeaders = await headers();
  const session = await getCachedSession(reqHeaders);
  return {
    session,
  };
};

type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create();

// Export routing and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;

