// Prisma 7's CLI does not auto-load .env, so load it here for migrate/seed/studio.
// (No-op in CI's postinstall `prisma generate`, where no .env exists.)
import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL is only needed for commands that touch the database (migrate, db push,
// studio). `prisma generate` — which runs on postinstall, including in CI without a DB —
// does not connect, so we fall back to an empty string rather than throwing here.
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    // Run with `prisma db seed`, or directly via `tsx prisma/seed.ts`.
    seed: "tsx prisma/seed.ts",
  },
});
