import { db } from "@/db";
import { tables } from "@/db/tables";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

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
    const existingAdmin = await db.select().from(userTable).where(eq(userTable.email, "iozera_admin@gmail.com"));
    if (existingAdmin.length === 0) {
      console.log("[Aika Seeder] Registering admin account...");
      const newUser = await auth.api.signUpEmail({
        body: {
          email: "iozera_admin@gmail.com",
          password: "youshallnotpass",
          name: "Iozera Admin",
        },
      });
      if (newUser && newUser.user) {
        await db.update(userTable)
          .set({ is_admin: true })
          .where(eq(userTable.id, newUser.user.id));
        console.log("[Aika Seeder] Admin iozera_admin@gmail.com seeded successfully.");
      }
    }
    isSeeded = true;
  } catch (e) {
    console.error("[Aika Seeder] Seeding error:", e);
  } finally {
    isSeeding = false;
  }
}
