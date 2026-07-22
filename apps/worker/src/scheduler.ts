import { Queue } from "bullmq";
import { connection } from "./config/redis";
import { JOB_QUEUE_NAME, JOB_NAMES } from "./queue";

/**
 * Registers the recurring jobs as BullMQ repeatables. Safe to call on every
 * boot — BullMQ dedupes repeatable jobs by (name + pattern), so restarting
 * the worker doesn't create duplicate schedules.
 */
export async function scheduleRecurringJobs(queue: Queue) {
  await queue.upsertJobScheduler(JOB_NAMES.AMC_RENEWAL_CHECK, { pattern: "0 6 * * *" }, {
    name: JOB_NAMES.AMC_RENEWAL_CHECK,
  });

  await queue.upsertJobScheduler(JOB_NAMES.SLA_BREACH_CHECK, { every: 5 * 60 * 1000 }, {
    name: JOB_NAMES.SLA_BREACH_CHECK,
  });

  await queue.upsertJobScheduler(JOB_NAMES.INVOICE_OVERDUE_CHECK, { pattern: "30 6 * * *" }, {
    name: JOB_NAMES.INVOICE_OVERDUE_CHECK,
  });

  await queue.upsertJobScheduler(JOB_NAMES.COORDINATOR_DIGEST, { pattern: "0 7 * * *" }, {
    name: JOB_NAMES.COORDINATOR_DIGEST,
  });
}

export function createJobQueue() {
  return new Queue(JOB_QUEUE_NAME, { connection });
}
