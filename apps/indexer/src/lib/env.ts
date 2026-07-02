import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  STELLAR_NETWORK_PASSPHRASE: z.string().min(1),
  STELLAR_RPC_URL: z.url(),
  STELLAR_HORIZON_URL: z.url(),
  NEXT_PUBLIC_STELLAR_RPC_URL: z.url(),
  KEEPER_PRIVATE_KEY: z.string().regex(/^S[A-Z2-7]{55}$/),
  INDEXER_CONFIRMATIONS: z.coerce.number().int().min(1).default(12),
  INDEXER_API_KEY: z.string().min(1),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  FACTORY_CONTRACT_ID: z.string().regex(/^[CG][A-Z2-7]{55}$/),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().default("Ember <no-reply@ember.app>"),
  NEXT_PUBLIC_APP_URL: z.url(),
});

export const indexerEnv = schema.parse(process.env);

export type IndexerEnv = z.infer<typeof schema>;