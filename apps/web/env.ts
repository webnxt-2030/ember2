import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  SHADOW_DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  SEED_SUPER_ADMIN_EMAIL: z.string().email(),
  SEED_SUPER_ADMIN_PASSWORD: z.string().min(14),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  RESEND_WEBHOOK_SECRET: z.string().min(1),
  KEEPER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  INDEXER_CONFIRMATIONS: z.coerce.number().int().min(1).default(12),
  STORAGE_DRIVER: z.enum(["railway-volume", "minio", "s3"]),
  STORAGE_ROOT: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5242880),
  DEFAULT_VOTING_PERIOD_SECONDS: z.coerce.number().int().positive().default(604800),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  SENTRY_DSN: z.string().url().optional().or(z.literal("")),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_REOWN_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_MORPH_CHAIN_ID: z.coerce.number().int().positive(),
  NEXT_PUBLIC_MORPH_RPC_URL: z.string().url(),
  NEXT_PUBLIC_MORPH_EXPLORER_URL: z.string().url(),
  NEXT_PUBLIC_USDT_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  NEXT_PUBLIC_FACTORY_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
});

function validateEnv() {
  const isServer = typeof window === "undefined";

  if (isServer) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error("❌ Invalid server environment variables:");
      console.error(parsed.error.flatten().fieldErrors);
      process.exit(1);
    }
  }

  const clientParsed = clientSchema.safeParse({
    NEXT_PUBLIC_REOWN_PROJECT_ID: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MORPH_CHAIN_ID: process.env.NEXT_PUBLIC_MORPH_CHAIN_ID,
    NEXT_PUBLIC_MORPH_RPC_URL: process.env.NEXT_PUBLIC_MORPH_RPC_URL,
    NEXT_PUBLIC_MORPH_EXPLORER_URL: process.env.NEXT_PUBLIC_MORPH_EXPLORER_URL,
    NEXT_PUBLIC_USDT_ADDRESS: process.env.NEXT_PUBLIC_USDT_ADDRESS,
    NEXT_PUBLIC_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_FACTORY_ADDRESS,
  });

  if (!clientParsed.success) {
    console.error("❌ Invalid client environment variables:");
    console.error(clientParsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return {
    ...(isServer ? serverSchema.parse(process.env) : {}),
    ...clientParsed.data,
  };
}

export const env = validateEnv();
