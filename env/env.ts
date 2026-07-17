import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    server: {
        DATABASE_URL: z.url(),
        NODE_ENV: z
            .union([z.literal("development"), z.literal("production")])
            .default("development"),
        DEBUG_MODE: z.coerce.boolean().default(false),
        SUPABASE_URL: z.url(),
        SUPABASE_ANON_KEY: z.string(),
        SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
        // Better Auth variables
        BETTER_AUTH_SECRET: z.string().default("secret-phrase-for-local-development-must-be-min-32-chars"),
        BETTER_AUTH_URL: z.url().default("http://localhost:3020"),
        GITHUB_CLIENT_ID: z.string().optional(),
        GITHUB_CLIENT_SECRET: z.string().optional(),
        GOOGLE_CLIENT_ID: z.string().optional(),
        GOOGLE_CLIENT_SECRET: z.string().optional(),
        SENTRY_AUTH_TOKEN: z.string().optional(),
        NOTION_CLIENT_ID: z.string().optional(),
        NOTION_CLIENT_SECRET: z.string().optional(),
        NOTION_REDIRECT_URI: z.string().optional(),
        NOTION_AUTHORIZATION_URL: z.string().optional(),
        // ADMIN
        ADMIN_EMAIL: z.string().optional(),
        ADMIN_PASSWORD: z.string().optional(),
    },
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        DEBUG_MODE: process.env.DEBUG_MODE,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
        NOTION_CLIENT_ID: process.env.NOTION_CLIENT_ID,
        NOTION_CLIENT_SECRET: process.env.NOTION_CLIENT_SECRET,
        NOTION_REDIRECT_URI: process.env.NOTION_REDIRECT_URI,
        NOTION_AUTHORIZATION_URL: process.env.NOTION_AUTHORIZATION_URL,
        // ADMIN
        ADMIN_EMAIL: process.env.ADMIN_EMAIL,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    },
});