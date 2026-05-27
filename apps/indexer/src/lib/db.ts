import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Prisma 7 requires a driver adapter; the pg Pool connects lazily.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});


if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;