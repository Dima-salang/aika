import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { newTaskZodSchema, taskZodSchema } from "@/db/schema";
import { TaskService } from "@/services/TaskService";
import { handleDbError } from "@/utils/db-errors";

const taskService = new TaskService();

export const tasksRouter = router({
  getTask: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        return await taskService.getTaskById(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  getTasks: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await taskService.listTasks({ userId: input.userId }, 1000);
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
    .input(taskZodSchema.partial().required({ id: true }))
    .mutation(async ({ input }) => {
      try {
        return await taskService.updateTask(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteTask: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await taskService.deleteTask(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),
});
