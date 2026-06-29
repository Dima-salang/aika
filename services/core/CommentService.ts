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
    ): Promise<Array<Comment & { user_name: string; user_image: string | null }>> {
        const commentTable = tables.comments;
        const userTable = tables.user;

        // get the comments with user details
        let query = tx
            .select({
                id: commentTable.id,
                log_id: commentTable.log_id,
                user_id: commentTable.user_id,
                parent_id: commentTable.parent_id,
                comment: commentTable.comment,
                created_at: commentTable.created_at,
                updated_at: commentTable.updated_at,
                deleted_at: commentTable.deleted_at,
                user_name: userTable.name,
                user_image: userTable.image,
            })
            .from(commentTable)
            .innerJoin(userTable, eq(commentTable.user_id, userTable.id))
            .$dynamic();

        const conditions: SQL[] = [];
        if (filter) {
            if (filter.log_id) {
                conditions.push(eq(commentTable.log_id, filter.log_id));
            }
            if (filter.user_id) {
                conditions.push(eq(commentTable.user_id, filter.user_id));
            }
        }
        conditions.push(isNull(commentTable.deleted_at));

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        const results = await query.orderBy(desc(commentTable.created_at)).limit(limit).offset(offset);
        return results as Array<Comment & { user_name: string; user_image: string | null }>;
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
