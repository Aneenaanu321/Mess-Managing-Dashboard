import { Worker, Job } from "bullmq";
import { connection } from "./config/redis";
import { JOB_QUEUE_NAME, JOB_NAMES } from "./queue";
import { runAmcRenewalCheck } from "./jobs/amcRenewal.job";
import { runSlaBreachCheck } from "./jobs/slaBreach.job";
import { runInvoiceOverdueCheck } from "./jobs/invoiceOverdue.job";

async function processJob(job: Job) {
  switch (job.name) {
    case JOB_NAMES.AMC_RENEWAL_CHECK:
      return runAmcRenewalCheck();
    case JOB_NAMES.SLA_BREACH_CHECK:
      return runSlaBreachCheck();
    case JOB_NAMES.INVOICE_OVERDUE_CHECK:
      return runInvoiceOverdueCheck();
    default:
      throw new Error(`Unknown job name: ${job.name}`);
  }
}

export function createJobWorker() {
  const worker = new Worker(JOB_QUEUE_NAME, processJob, { connection, concurrency: 1 });

  worker.on("completed", (job, result) => {
    // eslint-disable-next-line no-console
    console.log(`[worker] ${job.name} completed`, result);
  });

  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[worker] ${job?.name ?? "unknown"} failed:`, err);
  });

  return worker;
}
