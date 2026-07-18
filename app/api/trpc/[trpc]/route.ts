import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/server/trpc";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    responseMeta(opts) {
      const { type, errors, paths } = opts;
      const hasErrors = errors.length > 0;
      const isQuery = type === "query";

      if (isQuery && !hasErrors) {
        const isPublic = paths && paths.length > 0 && paths.every(path => 
          path.includes("validateJoinToken") || 
          path.includes("healthCheck")
        );

        if (isPublic) {
          return {
            headers: {
              "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
            },
          };
        }

        // By default, private/user-specific queries should not be cached by the browser
        // to prevent stale state collisions during client-side invalidations
        return {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        };
      }

      return {};
    },
  });

export { handler as GET, handler as POST };
