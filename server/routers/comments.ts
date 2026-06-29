import { CommentService } from "@/services/core/CommentService";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { handleDbError } from "@/utils/db-errors";
import { TRPCError } from "@trpc/server";

const service = new CommentService();
const listCommentsFilterSchema = z.object({
    log_id: z.string().optional(),
    user_id: z.string().optional(),
    parent_id: z.string().optional(),
});

export const commentRouter = router({
    listComments: publicProcedure
        .input(z.object({
            filter: listCommentsFilterSchema.optional(),
            offset: z.number().int().nonnegative().optional().default(0),
            limit: z.number().int().positive().optional().default(5),
        }))
        .query(async ({ input }) => {
            try {
                const { filter, offset, limit } = input;
                return await service.listComments(filter, offset, limit);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
                }
                handleDbError(error);
            }
        }),
    getCommentById: publicProcedure
        .input(z.object({
            id: z.string(),
        }))
        .query(async ({ input }) => {
            try {
                const { id } = input;
                return await service.getCommentById(id);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
                }
                handleDbError(error);
            }
        }),
    createComment: publicProcedure
        .input(z.object({
            log_id: z.string(),
            user_id: z.string(),
            parent_id: z.string().optional(),
            comment: z.string().min(1),
        }))
        .mutation(async ({ input }) => {
            try {
                return await service.createComment(input);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
                }
                handleDbError(error);
            }
        }),
    updateComment: publicProcedure
        .input(z.object({
            id: z.string().min(1),
            comment: z.string().min(1),
        }))
        .mutation(async ({ input }) => {
            try {
                return await service.updateComment(input.id, { comment: input.comment });
            } catch (error) {
                if (error instanceof z.ZodError) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
                }
                handleDbError(error);
            }
        }),
    deleteComment: publicProcedure
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ input }) => {
            try {
                const { id } = input;
                return await service.deleteComment(id);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
                }
                handleDbError(error);
            }
        }),
});