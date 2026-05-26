import { Queue, Worker } from "bullmq";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { sendEmail } from "./email.js";

interface EmailJob {
  id: string;
  to: string;
  template: string;
  payload: Record<string, unknown>;
}

const EMAIL_QUEUE_NAME = "emails";
const POLL_INTERVAL_MS = 10_000;
const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

let emailQueue: Queue<EmailJob> | null = null;
let emailWorker: Worker<EmailJob> | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  return { connection: { url: redisUrl } };
}

export function getEmailQueue(): Queue<EmailJob> {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJob>(EMAIL_QUEUE_NAME, getRedisConnection());
  }
  return emailQueue;
}

async function pollPendingEmails() {
  const pending = await prisma.emailNotification.findMany({
    where: { status: "QUEUED" },
    take: BATCH_SIZE,
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) return;

  logger.debug({ count: pending.length }, "Email worker: polling queue");

  await prisma.emailNotification.updateMany({
    where: { id: { in: pending.map((r) => r.id) } },
    data: { status: "PROCESSING" },
  });

  const queue = getEmailQueue();

  await queue.addBulk(
    pending.map((row) => ({
      name: row.id,
      data: {
        id: row.id,
        to: row.to,
        template: row.template,
        payload: row.payload as Record<string, unknown>,
      },
      opts: {
        jobId: row.id,
        attempts: MAX_RETRIES,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    }))
  );
}

async function processEmailJob(job: { data: EmailJob }): Promise<void> {
  const { id, to, template, payload } = job.data;

  logger.info({ emailId: id, to, template }, "Email worker: sending");

  try {
    const { resendId } = await sendEmail({ id, to, template, payload });

    await prisma.emailNotification.update({
      where: { id },
      data: {
        status: "SENT",
        resendId: resendId ?? null,
        sentAt: new Date(),
      },
    });

    logger.info({ emailId: id, resendId }, "Email worker: sent");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    const notification = await prisma.emailNotification.findUnique({
      where: { id },
      select: { status: true },
    });

    if (notification?.status === "SENT") return;

    logger.error({ emailId: id, err }, "Email worker: failed");

    await prisma.emailNotification.update({
      where: { id },
      data: { status: "FAILED", error: message },
    });

    throw err;
  }
}

export function startEmailWorker() {
  logger.info("Email worker: starting");

  emailWorker = new Worker<EmailJob>(
    EMAIL_QUEUE_NAME,
    async (job) => {
      await processEmailJob(job);
    },
    {
      ...getRedisConnection(),
      concurrency: 5,
    }
  );

  emailWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, failedReason: err?.message }, "Email worker: job failed");
  });

  emailWorker.on("completed", (job) => {
    logger.debug({ jobId: job?.id }, "Email worker: job completed");
  });

  pollInterval = setInterval(pollPendingEmails, POLL_INTERVAL_MS);

  logger.info(
    { queue: EMAIL_QUEUE_NAME, pollIntervalMs: POLL_INTERVAL_MS },
    "Email worker: started"
  );
}

export async function stopEmailWorker() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    logger.info("Email worker: stopped");
  }

  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }
}