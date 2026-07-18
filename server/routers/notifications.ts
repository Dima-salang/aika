import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { NotificationService } from "@/services/core/NotificationService";
import { handleDbError } from "@/utils/db-errors";
import { TRPCError } from "@trpc/server";

const notificationService = new NotificationService();

export const notificationsRouter = router({
  getNotifications: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await notificationService.listNotifications({ userId: input.userId });
      } catch (error) {
        handleDbError(error);
      }
    }),

  markAsRead: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const notif = await notificationService.getNotificationById(input.id);
        if (!notif) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
        }
        if (notif.user_id !== ctx.session.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this notification" });
        }
        return await notificationService.updateNotification(input.id, { is_read: true });
      } catch (error) {
        handleDbError(error);
      }
    }),

  markAllAsRead: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
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

  deleteNotification: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const notif = await notificationService.getNotificationById(input.id);
        if (!notif) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
        }
        if (notif.user_id !== ctx.session.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this notification" });
        }
        return await notificationService.deleteNotification(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),
});

