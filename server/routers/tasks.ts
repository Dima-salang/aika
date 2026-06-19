import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import {
  newTaskZodSchema,
  getTasksInputZodSchema,
  updateTaskRouterInputZodSchema,
  idInputZodSchema,
} from "@/db/schema";
import { TaskService } from "@/services/core/TaskService";
import { handleDbError } from "@/utils/db-errors";

const taskService = new TaskService();

export const tasksRouter = router({
  getTask: publicProcedure
    .input(idInputZodSchema)
    .query(async ({ input }) => {
      try {
        return await taskService.getTaskById(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  getTasks: publicProcedure
    .input(getTasksInputZodSchema)
    .query(async ({ input }) => {
      try {
        return await taskService.listTasks({ userId: input.userId }, input.pagination);
      } catch (error) {
        handleDbError(error);
      }
    }),

  createTask: publicProcedure
    .input(newTaskZodSchema)
    .mutation(async ({ input }) => {
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

  updateTask: publicProcedure
    .input(updateTaskRouterInputZodSchema)
    .mutation(async ({ input }) => {
      try {
        return await taskService.updateTask(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteTask: publicProcedure
    .input(idInputZodSchema)
    .mutation(async ({ input }) => {
      try {
        return await taskService.deleteTask(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),
});
