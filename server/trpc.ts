import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { cache } from "react";

// Memoize session resolution per-request to deduplicate DB queries
const getCachedSession = cache(async (headersList: Headers) => {
  return await auth.api.getSession({
    headers: headersList,
  });
});

// Define the tRPC request context
export const createContext = async () => {
  const reqHeaders = await headers();
  const session = await getCachedSession(reqHeaders);
  return {
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create();

// Export routing and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;

// Protected procedure that ensures user is authenticated
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});


