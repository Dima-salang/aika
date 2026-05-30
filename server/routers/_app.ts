import { router, publicProcedure } from "../trpc";
import { z } from "zod";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }),
});

// Export type definition of API
export type AppRouter = typeof appRouter;
