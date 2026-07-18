import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { getPersonalReportInputZodSchema, getTeamReportInputZodSchema } from "@/db/schema";
import { handleDbError } from "@/utils/db-errors";
import { ReportService } from "@/services/core/ReportService";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { tables } from "@/db/tables";
import { eq, and } from "drizzle-orm";

const reportService = new ReportService();

export const reportsRouter = router({
  getPersonalReport: protectedProcedure
    .input(getPersonalReportInputZodSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only request your own personal report" });
      }
      try {
        const teamFilter = input.teamIdFilter === "all" ? "all" : input.teamIdFilter;
        return await reportService.getPersonalReport(
          input.userId,
          input.organizationId,
          teamFilter || null,
          input.startDate,
          input.endDate
        );
      } catch (error) {
        handleDbError(error);
      }
    }),

  getTeamReport: protectedProcedure
    .input(getTeamReportInputZodSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.requestingUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only request team reports using your own user ID" });
      }
      const [tm] = await db
        .select()
        .from(tables.teamMembers)
        .where(and(eq(tables.teamMembers.team_id, input.teamId), eq(tables.teamMembers.user_id, ctx.session.user.id)));
      if (!tm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this team's report" });
      }
      try {
        return await reportService.getTeamReport(
          input.requestingUserId,
          input.organizationId,
          input.teamId,
          input.startDate,
          input.endDate
        );
      } catch (error) {
        handleDbError(error);
      }
    }),
});

