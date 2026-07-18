import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import {
  newTaskZodSchema,
  getTasksInputZodSchema,
  updateTaskRouterInputZodSchema,
  idInputZodSchema,
} from "@/db/schema";
import { TaskService } from "@/services/core/TaskService";
import { handleDbError } from "@/utils/db-errors";
import { db } from "@/db";
import { tables } from "@/db/tables";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const taskService = new TaskService();

export const tasksRouter = router({
  getTask: protectedProcedure
    .input(idInputZodSchema)
    .query(async ({ ctx, input }) => {
      try {
        const task = await taskService.getTaskById(input.id);
        if (!task) return null;
        const isDefaultOrg = task.organization_id === "org-default";
        const [m] = isDefaultOrg
          ? [undefined]
          : await db
              .select()
              .from(tables.member)
              .where(and(eq(tables.member.userId, ctx.session.user.id), eq(tables.member.organizationId, task.organization_id)));
        if (!m && task.user_id !== ctx.session.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this task" });
        }
        return task;
      } catch (error) {
        handleDbError(error);
      }
    }),

  getTasks: protectedProcedure
    .input(getTasksInputZodSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only list your own tasks" });
      }
      try {
        return await taskService.listTasks({ userId: input.userId }, input.pagination);
      } catch (error) {
        handleDbError(error);
      }
    }),

  createTask: protectedProcedure
    .input(newTaskZodSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.organization_id !== "org-default") {
        const [m] = await db
          .select()
          .from(tables.member)
          .where(and(eq(tables.member.userId, ctx.session.user.id), eq(tables.member.organizationId, input.organization_id)));
        if (!m) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You must belong to the organization to create a task" });
        }
      }
      if (input.user_id !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only create tasks assigned to yourself" });
      }
      try {
        return await taskService.createTask({
          status: "backlog",
          ...input,
          id: input.id || crypto.randomUUID(),
        });
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateTask: protectedProcedure
    .input(updateTaskRouterInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const task = await taskService.getTaskById(input.id);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        }
        if (task.user_id !== ctx.session.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this task" });
        }
        return await taskService.updateTask(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteTask: protectedProcedure
    .input(idInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const task = await taskService.getTaskById(input.id);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        }
        if (task.user_id !== ctx.session.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this task" });
        }
        return await taskService.deleteTask(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),
});

