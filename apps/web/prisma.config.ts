import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    ...(process.env.DATABASE_URL && { url: process.env.DATABASE_URL }),
  },
});
