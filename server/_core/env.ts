import { z } from "zod";

const envSchema = z.object({
  // DB
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Session
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .refine((s) => s !== "replace-with-a-random-secret-min-32-chars", {
      message: "JWT_SECRET must be changed from the default value",
    }),

  // Token encryption
  ENCRYPTION_KEY: z
    .string()
    .min(1)
    .optional()
    .default("0000000000000000000000000000000000000000000000000000000000000000"),

  // CORS
  ALLOWED_ORIGINS: z.string().optional().default(""),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Local auth (optional)
  LOCAL_ADMIN_EMAIL: z.string().email().optional().default(""),
  LOCAL_ADMIN_PASSWORD: z.string().optional().default(""),
  LOCAL_ADMIN_NAME: z.string().optional().default("Admin"),

  // OAuth (optional)
  OAUTH_SERVER_URL: z.string().url().optional().or(z.literal("")),
  VITE_APP_ID: z.string().optional().default(""),
  OWNER_OPEN_ID: z.string().optional().default(""),

  // AI features (optional)
  BUILT_IN_FORGE_API_URL: z.string().optional().default(""),
  BUILT_IN_FORGE_API_KEY: z.string().optional().default(""),

  // X (Twitter) API (optional)
  TWITTER_BEARER_TOKEN: z.string().optional().default(""),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),

  // Email (optional)
  RESEND_API_KEY: z.string().optional().default(""),
  FROM_EMAIL: z.string().optional().default("noreply@example.com"),

  // Sentry (optional)
  SENTRY_DSN: z.string().optional().default(""),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`\n[ENV] Fatal: environment validation failed:\n${errors}\n`);
    process.exit(1);
  }
  return result.data;
}

const parsed = parseEnv();

export const ENV = {
  appId: parsed.VITE_APP_ID,
  cookieSecret: parsed.JWT_SECRET,
  encryptionKey: parsed.ENCRYPTION_KEY,
  databaseUrl: parsed.DATABASE_URL,
  oAuthServerUrl: parsed.OAUTH_SERVER_URL ?? "",
  ownerOpenId: parsed.OWNER_OPEN_ID,
  isProduction: parsed.NODE_ENV === "production",
  port: parsed.PORT,
  allowedOrigins: parsed.ALLOWED_ORIGINS
    ? parsed.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : [],
  forgeApiUrl: parsed.BUILT_IN_FORGE_API_URL,
  forgeApiKey: parsed.BUILT_IN_FORGE_API_KEY,
  // Local auth
  localAdminEmail: parsed.LOCAL_ADMIN_EMAIL,
  localAdminPassword: parsed.LOCAL_ADMIN_PASSWORD,
  localAdminName: parsed.LOCAL_ADMIN_NAME,
  // External services
  twitterBearerToken: parsed.TWITTER_BEARER_TOKEN,
  stripeSecretKey: parsed.STRIPE_SECRET_KEY,
  stripeWebhookSecret: parsed.STRIPE_WEBHOOK_SECRET,
  resendApiKey: parsed.RESEND_API_KEY,
  fromEmail: parsed.FROM_EMAIL,
  sentryDsn: parsed.SENTRY_DSN,
};
