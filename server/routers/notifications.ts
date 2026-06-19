import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { NotificationService } from "@/services/core/NotificationService";
import { handleDbError } from "@/utils/db-errors";

const notificationService = new NotificationService();

export const notificationsRouter = router({
  getNotifications: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await notificationService.listNotifications({ userId: input.userId });
      } catch (error) {
        handleDbError(error);
      }
    }),

  markAsRead: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await notificationService.updateNotification(input.id, { is_read: true });
      } catch (error) {
        handleDbError(error);
      }
    }),

  markAllAsRead: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const notifs = await notificationService.listNotifications({ userId: input.userId, isRead: false });
        const results = [];
        for (const notif of notifs) {
          const res = await notificationService.updateNotification(notif.id, { is_read: true });
          if (res) results.push(res);
        }
        return results;
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteNotification: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await notificationService.deleteNotification(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),
});
