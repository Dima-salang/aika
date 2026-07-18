import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import {
  getProjectInputZodSchema,
  getProjectsInputZodSchema,
  createProjectRouterInputZodSchema,
  updateProjectRouterInputZodSchema,
  idInputZodSchema,
} from "@/db/schema";
import { ProjectService } from "@/services/core/ProjectService";
import { handleDbError } from "@/utils/db-errors";
import { db } from "@/db";
import { tables } from "@/db/tables";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const projectService = new ProjectService();

export const projectsRouter = router({
  getProject: protectedProcedure
    .input(getProjectInputZodSchema)
    .query(async ({ ctx, input }) => {
      try {
        const project = await projectService.getProject(input.id);
        if (!project) return null;
        const isDefaultOrg = project.organization_id === "org-default";
        const [m] = isDefaultOrg
          ? [true]
          : await db
              .select()
              .from(tables.member)
              .where(and(eq(tables.member.userId, ctx.session.user.id), eq(tables.member.organizationId, project.organization_id)));
        if (!m && project.user_id !== ctx.session.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this project" });
        }
        return project;
      } catch (error) {
        handleDbError(error);
      }
    }),

  getProjects: protectedProcedure
    .input(getProjectsInputZodSchema)
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.session.user.id;
        if (input.organizationId !== "org-default") {
          const [m] = await db
            .select()
            .from(tables.member)
            .where(and(eq(tables.member.userId, userId), eq(tables.member.organizationId, input.organizationId)));
          if (!m) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You do not belong to this organization" });
          }
        }
        return await projectService.listProjects(input.pagination, {
          organizationId: input.organizationId,
          teamId: input.teamId,
          userId,
        });
      } catch (error) {
        handleDbError(error);
      }
    }),

  createProject: protectedProcedure
    .input(createProjectRouterInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { userId, ...projectData } = input;
        const targetUserId = userId || ctx.session.user.id;
        if (targetUserId !== ctx.session.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create project for another user" });
        }
        if (projectData.organization_id !== "org-default") {
          const [m] = await db
            .select()
            .from(tables.member)
            .where(and(eq(tables.member.userId, ctx.session.user.id), eq(tables.member.organizationId, projectData.organization_id)));
          if (!m) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You do not belong to this organization" });
          }
        }
        return await projectService.createProject(
          {
            ...projectData,
            id: projectData.id || crypto.randomUUID(),
          },
          targetUserId
        );
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateProject: protectedProcedure
    .input(updateProjectRouterInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const project = await projectService.getProject(input.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        const isDefaultOrg = project.organization_id === "org-default";
        const [m] = isDefaultOrg
          ? [true]
          : await db
              .select()
              .from(tables.member)
              .where(and(eq(tables.member.userId, ctx.session.user.id), eq(tables.member.organizationId, project.organization_id)));
        if (!m && project.user_id !== ctx.session.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to manage this project" });
        }
        return await projectService.updateProject(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteProject: protectedProcedure
    .input(idInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const project = await projectService.getProject(input.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        const isDefaultOrg = project.organization_id === "org-default";
        const [m] = isDefaultOrg
          ? [true]
          : await db
              .select()
              .from(tables.member)
              .where(and(eq(tables.member.userId, ctx.session.user.id), eq(tables.member.organizationId, project.organization_id)));
        if (!m && project.user_id !== ctx.session.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to manage this project" });
        }
        return await projectService.deleteProject(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),
});

