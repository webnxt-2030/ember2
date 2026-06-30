import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.url(),
  SHADOW_DATABASE_URL: z.url().optional(),
  REDIS_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  SEED_SUPER_ADMIN_EMAIL: z.email(),
  SEED_SUPER_ADMIN_PASSWORD: z.string().min(14),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  RESEND_WEBHOOK_SECRET: z.string().min(1),
  KEEPER_PRIVATE_KEY: z.string().regex(/^S[A-Z2-7]{55}$/),
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
  SENTRY_DSN: z.url().optional().or(z.literal("")),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_STELLAR_NETWORK: z.enum(["TESTNET", "PUBLIC", "FUTURENET"]).default("TESTNET"),
  NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: z.string().min(1),
  NEXT_PUBLIC_STELLAR_RPC_URL: z.url(),
  NEXT_PUBLIC_STELLAR_HORIZON_URL: z.url(),
  NEXT_PUBLIC_STELLAR_EXPLORER_URL: z.url(),
  NEXT_PUBLIC_USDC_CONTRACT_ID: z.string().regex(/^[CG][A-Z2-7]{55}$/),
  NEXT_PUBLIC_FACTORY_CONTRACT_ID: z.string().regex(/^[CG][A-Z2-7]{55}$/).optional(),
});

function validateEnv() {
  const isServer = typeof window === "undefined";

  if (isServer) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error("❌ Invalid server environment variables:");
      console.error(z.treeifyError(parsed.error));
      process.exit(1);
    }
  }

  const clientParsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE,
    NEXT_PUBLIC_STELLAR_RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
    NEXT_PUBLIC_STELLAR_HORIZON_URL: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL,
    NEXT_PUBLIC_STELLAR_EXPLORER_URL: process.env.NEXT_PUBLIC_STELLAR_EXPLORER_URL,
    NEXT_PUBLIC_USDC_CONTRACT_ID: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID,
    NEXT_PUBLIC_FACTORY_CONTRACT_ID: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID,
  });

  if (!clientParsed.success) {
    console.error("❌ Invalid client environment variables:");
    console.error(z.treeifyError(clientParsed.error));
    process.exit(1);
  }

  return {
    ...(isServer ? serverSchema.parse(process.env) : {}),
    ...clientParsed.data,
  };
}

export const env = validateEnv();
