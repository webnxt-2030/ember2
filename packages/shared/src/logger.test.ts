import { describe, it, expect } from "vitest";
import pino from "pino";

describe("logger redaction", () => {
  it("redacts password field", () => {
    const lines: string[] = [];
    const testLogger = pino(
      {
        level: "info",
        redact: {
          paths: ["password", "passwordHash", "accessToken", "refreshToken", "privateKey", "secret", "apiKey"],
          censor: "[REDACTED]",
        },
      },
      {
        write(chunk: string) {
          lines.push(chunk);
        },
      }
    );

    testLogger.info({ password: "foo", username: "alice" }, "test");

    const line = lines[0];
    expect(line).toBeDefined();
    const parsed = JSON.parse(line as string) as { password: string; username: string };
    expect(parsed.password).toBe("[REDACTED]");
    expect(parsed.username).toBe("alice");
  });

  it("redacts accessToken field", () => {
    const lines: string[] = [];
    const testLogger = pino(
      {
        level: "info",
        redact: {
          paths: ["password", "passwordHash", "accessToken", "refreshToken", "privateKey", "secret", "apiKey"],
          censor: "[REDACTED]",
        },
      },
      {
        write(chunk: string) {
          lines.push(chunk);
        },
      }
    );

    testLogger.info({ accessToken: "eyJ..." }, "test");

    const line = lines[0];
    expect(line).toBeDefined();
    const parsed = JSON.parse(line as string) as { accessToken: string };
    expect(parsed.accessToken).toBe("[REDACTED]");
  });
});
