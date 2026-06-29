import { db, DBInstance } from "@/db";
import { tables } from "@/db/tables";
import { Comment, NewComment } from "@/db/schema";
import { eq, and, isNull, desc, SQL } from "drizzle-orm";
import { z } from "zod";

const createCommentSchema = z.object({
    log_id: z.string(),
    user_id: z.string(),
    parent_id: z.string().optional(),
    comment: z.string(),
});
type createComment = z.infer<typeof createCommentSchema>;

const listCommentsFilterSchema = z.object({
    log_id: z.string().optional(),
    user_id: z.string().optional(),
});
type listCommentsFilter = z.infer<typeof listCommentsFilterSchema>;

export class CommentService {
    async getCommentById(id: string, tx: DBInstance = db): Promise<Comment | null> {
        const table = tables.comments;
        const [res] = await tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), isNull(table.deleted_at)));
        return res || null;
    }

    async listComments(
        filter?: listCommentsFilter,
        offset = 0,
        limit = 5,
        tx: DBInstance = db
    ): Promise<Comment[]> {
        const table = tables.comments;
        let query = tx.select().from(table).$dynamic();

        const conditions: SQL[] = [];
        if (filter) {
            if (filter.log_id) {
                conditions.push(eq(table.log_id, filter.log_id));
            }
            if (filter.user_id) {
                conditions.push(eq(table.user_id, filter.user_id));
            }
        }
        conditions.push(isNull(table.deleted_at));

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        return await query.orderBy(desc(table.created_at)).limit(limit).offset(offset);
    }

    async createComment(data: createComment, tx: DBInstance = db): Promise<Comment | null> {
        const table = tables.comments;
        const newId = crypto.randomUUID();
        const [res] = await tx
            .insert(table)
            .values({
                id: newId,
                log_id: data.log_id,
                user_id: data.user_id,
                parent_id: data.parent_id,
                comment: data.comment,
                created_at: new Date(),
                updated_at: new Date(),
            })
            .returning();
        return res || null;
    }

    async updateComment(id: string, data: Partial<Comment>, tx: DBInstance = db): Promise<Comment | null> {
        const table = tables.comments;
        const [res] = await tx
            .update(table)
            .set({
                ...data,
                updated_at: new Date(),
            })
            .where(eq(table.id, id))
            .returning();
        return res || null;
    }

    async deleteComment(id: string, tx: DBInstance = db): Promise<Comment | null> {
        const table = tables.comments;
        const [res] = await tx
            .update(table)
            .set({
                deleted_at: new Date(),
            })
            .where(eq(table.id, id))
            .returning();
        return res || null;
    }
}
