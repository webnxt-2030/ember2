import { defineConfig } from "prisma/config";

// DATABASE_URL is only needed for commands that touch the database (migrate, db push,
// studio). `prisma generate` — which runs on postinstall, including in CI without a DB —
// does not connect, so we fall back to an empty string rather than throwing here.
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
