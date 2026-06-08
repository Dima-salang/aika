import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { newProjectZodSchema, projectZodSchema } from "@/db/schema";
import { ProjectService } from "@/services/ProjectService";
import { handleDbError } from "@/utils/db-errors";

const projectService = new ProjectService();

export const projectsRouter = router({
  getProject: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        return await projectService.getProject(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  getProjects: publicProcedure
    .input(z.object({ 
      organizationId: z.string(),
      teamId: z.string().nullable().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.session?.user?.id;
        return await projectService.listProjects({
          organizationId: input.organizationId,
          teamId: input.teamId,
          userId,
        }, 1000);
      } catch (error) {
        handleDbError(error);
      }
    }),

  createProject: publicProcedure
    .input(newProjectZodSchema.extend({ userId: z.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        const { userId, ...projectData } = input;
        return await projectService.createProject(
          {
            ...projectData,
            id: projectData.id || crypto.randomUUID(),
          },
          userId
        );
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateProject: publicProcedure
    .input(projectZodSchema.partial().required({ id: true }))
    .mutation(async ({ input }) => {
      try {
        return await projectService.updateProject(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteProject: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await projectService.deleteProject(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),
});
