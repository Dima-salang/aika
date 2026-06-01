import { db, isSQLite } from "@/db";
import { user, userSqlite } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export class UserService {
  async getUserById(id: string, tx: any = db): Promise<any> {
    if (isSQLite) {
      const [res] = await tx
        .select()
        .from(userSqlite)
        .where(and(eq(userSqlite.id, id), isNull(userSqlite.deleted_at)));
      return res || null;
    } else {
      const [res] = await tx
        .select()
        .from(user)
        .where(and(eq(user.id, id), isNull(user.deleted_at)));
      return res || null;
    }
  }
}
