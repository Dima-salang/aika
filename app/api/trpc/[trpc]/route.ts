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
        // Check if any query in the request is a public/static endpoint
        const isPublic = paths && paths.some(path => 
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

        // Private/user-specific queries should allow browser cache but bypass shared CDNs
        return {
          headers: {
            "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
          },
        };
      }

      return {};
    },
  });

export { handler as GET, handler as POST };
