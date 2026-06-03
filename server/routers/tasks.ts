import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { newTaskZodSchema, taskZodSchema } from "@/db/schema";
import { TaskService } from "@/services/TaskService";

const taskService = new TaskService();

export const tasksRouter = router({
  getTask: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await taskService.getTaskById(input.id);
    }),

  getTasks: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await taskService.listTasks({ userId: input.userId }, 1000);
    }),

  createTask: publicProcedure
    .input(newTaskZodSchema)
    .mutation(async ({ input }) => {
      return await taskService.createTask({
        status: "backlog",
        ...input,
        id: input.id || crypto.randomUUID(),
      });
    }),

  updateTask: publicProcedure
    .input(taskZodSchema.partial().required({ id: true }))
    .mutation(async ({ input }) => {
      return await taskService.updateTask(input.id, input);
    }),

  deleteTask: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await taskService.deleteTask(input.id);
    }),
});
