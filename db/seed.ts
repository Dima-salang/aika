import { db } from "@/db";
import { tables } from "@/db/tables";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { env } from "@/env/env";

let isSeeding = false;
let isSeeded = false;


export async function ensureSeed() {
  if (isSeeded || isSeeding) return;
  isSeeding = true;
  try {
    // 1. Seed default organization
    const orgTable = tables.organization;
    const existingOrg = await db.select().from(orgTable).where(eq(orgTable.id, "org-default"));
    if (existingOrg.length === 0) {
      await db.insert(orgTable).values({
        id: "org-default",
        name: "Default Workspace",
        slug: "default-workspace",
        createdAt: new Date(),
      });
      console.log("[Aika Seeder] Default workspace seeded.");
    }

    // 2. Seed default admin account
    const userTable = tables.user;
    const existingAdmin = await db.select().from(userTable).where(eq(userTable.email, env.ADMIN_EMAIL!));
    if (existingAdmin.length === 0) {
      console.log("[Aika Seeder] Registering admin account...");
      const newUser = await auth.api.signUpEmail({
        body: {
          email: env.ADMIN_EMAIL!,
          password: env.ADMIN_PASSWORD!,
          name: "Aika Admin",
        },
      });
      if (newUser && newUser.user) {
        await db.update(userTable)
          .set({ is_admin: true })
          .where(eq(userTable.id, newUser.user.id));
        console.log(`[Aika Seeder] Admin ${env.ADMIN_EMAIL} seeded successfully.`);
      }
    }
    isSeeded = true;
  } catch (e) {
    console.error("[Aika Seeder] Seeding error:", e);
  } finally {
    isSeeding = false;
  }
}
