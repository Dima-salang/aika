import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, isSQLite } from "@/db";
import * as schema from "@/db/schema";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    // Dynamically toggle dialect for development/production
    provider: isSQLite ? "sqlite" : "pg",
    schema: schema,
  }),
  user: {
    additionalFields: {
      is_admin: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "placeholder",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
    },
  },
  plugins: [
    organization({
      teams: {
        enabled: true,
      },
      schema: {
        team: {
          modelName: "teams",
          fields: {
            organizationId: "organization_id",
            createdAt: "created_at",
            updatedAt: "updated_at",
          },
        },
        teamMember: {
          modelName: "team_members",
          fields: {
            teamId: "team_id",
            userId: "user_id",
            createdAt: "created_at",
            updatedAt: "updated_at",
          },
        },
      },
    }),
  ],
});
export type Auth = typeof auth;
