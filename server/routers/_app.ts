import { router, publicProcedure, mergeRouters } from "../trpc";
import { ensureSeed } from "@/db/seed";

// Router Imports
import { adminRouter } from "./admin";
import { tasksRouter } from "./tasks";
import { projectsRouter } from "./projects";
import { logsRouter } from "./logs";

// Run database seeding exactly once on startup
ensureSeed().catch((err) => {
  console.error("[Aika Startup] Database seeding failed:", err);
});

// Base router containing healthCheck and nested admin router
const baseRouter = router({
  healthCheck: publicProcedure.query(async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }),

  // Nest admin router
  admin: adminRouter,
});

// Merge all modular sub-routers into the parent appRouter to preserve the flat root-level namespace
export const appRouter = mergeRouters(
  baseRouter,
  tasksRouter,
  projectsRouter,
  logsRouter
);

export type AppRouter = typeof appRouter;
