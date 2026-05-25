import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  MORPH_RPC_URL: z.string().url(),
  NEXT_PUBLIC_MORPH_RPC_URL: z.string().url(),
  KEEPER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  INDEXER_CONFIRMATIONS: z.coerce.number().int().min(1).default(12),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  FACTORY_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

export const indexerEnv = schema.parse(process.env);

export type IndexerEnv = z.infer<typeof schema>;