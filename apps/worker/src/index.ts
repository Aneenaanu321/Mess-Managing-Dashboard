import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { connection } from "./config/redis";
import { createJobQueue, scheduleRecurringJobs } from "./scheduler";
import { createJobWorker } from "./worker";

async function main() {
  const queue = createJobQueue();
  await scheduleRecurringJobs(queue);
  const worker = createJobWorker();

  // eslint-disable-next-line no-console
  console.log(`RFIDCore worker started [${env.NODE_ENV}], scheduling: AMC renewal (daily), SLA breach (5m), invoice overdue (daily)`);

  async function shutdown(signal: string) {
    // eslint-disable-next-line no-console
    console.log(`${signal} received, shutting down gracefully...`);
    await worker.close();
    await queue.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Worker failed to start:", err);
  process.exit(1);
});
