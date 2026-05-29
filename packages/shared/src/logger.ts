import pino from "pino";

const REDACTED_PATHS = [
  "password",
  "passwordHash",
  "accessToken",
  "refreshToken",
  "privateKey",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "*.password",
  "*.passwordHash",
  "*.accessToken",
  "*.refreshToken",
  "*.privateKey",
  "*.secret",
  "*.apiKey",
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: REDACTED_PATHS,
    censor: "[REDACTED]",
  },
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
});
