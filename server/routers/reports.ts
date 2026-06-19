import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { getPersonalReportInputZodSchema, getTeamReportInputZodSchema } from "@/db/schema";
import { handleDbError } from "@/utils/db-errors";
import { ReportService } from "@/services/core/ReportService";

const reportService = new ReportService();

export const reportsRouter = router({
  getPersonalReport: publicProcedure
    .input(getPersonalReportInputZodSchema)
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
    .input(getTeamReportInputZodSchema)
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
