import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import {
  getProjectInputZodSchema,
  getProjectsInputZodSchema,
  createProjectRouterInputZodSchema,
  updateProjectRouterInputZodSchema,
  idInputZodSchema,
} from "@/db/schema";
import { ProjectService } from "@/services/ProjectService";
import { handleDbError } from "@/utils/db-errors";

const projectService = new ProjectService();

export const projectsRouter = router({
  getProject: publicProcedure
    .input(getProjectInputZodSchema)
    .query(async ({ input }) => {
      try {
        return await projectService.getProject(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  getProjects: publicProcedure
    .input(getProjectsInputZodSchema)
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.session?.user?.id;
        return await projectService.listProjects(input.pagination, {
          organizationId: input.organizationId,
          teamId: input.teamId,
          userId,
        });
      } catch (error) {
        handleDbError(error);
      }
    }),

  createProject: publicProcedure
    .input(createProjectRouterInputZodSchema)
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
    .input(updateProjectRouterInputZodSchema)
    .mutation(async ({ input }) => {
      try {
        return await projectService.updateProject(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteProject: publicProcedure
    .input(idInputZodSchema)
    .mutation(async ({ input }) => {
      try {
        return await projectService.deleteProject(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),
});
