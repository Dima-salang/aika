import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { handleDbError } from "@/utils/db-errors";
import { ReportService } from "@/services/ReportService";

const reportService = new ReportService();

export const reportsRouter = router({
  getPersonalReport: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        teamIdFilter: z.string().nullable().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
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

  getTeamReport: publicProcedure
    .input(
      z.object({
        requestingUserId: z.string(),
        organizationId: z.string(),
        teamId: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
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
