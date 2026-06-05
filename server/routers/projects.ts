import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { newProjectZodSchema, projectZodSchema } from "@/db/schema";
import { ProjectService } from "@/services/ProjectService";

const projectService = new ProjectService();

export const projectsRouter = router({
  getProject: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await projectService.getProject(input.id);
    }),

  getProjects: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;
      return await projectService.listProjects({
        organizationId: input.organizationId,
        userId,
      }, 1000);
    }),

  createProject: publicProcedure
    .input(newProjectZodSchema.extend({ userId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { userId, ...projectData } = input;
      return await projectService.createProject(
        {
          ...projectData,
          id: projectData.id || crypto.randomUUID(),
        },
        userId
      );
    }),


  updateProject: publicProcedure
    .input(projectZodSchema.partial().required({ id: true }))
    .mutation(async ({ input }) => {
      return await projectService.updateProject(input.id, input);
    }),

  deleteProject: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await projectService.deleteProject(input.id);
    }),
});
