export const JOB_QUEUE_NAME = "rfidcore-jobs";

export const JOB_NAMES = {
  AMC_RENEWAL_CHECK: "amc-renewal-check",
  SLA_BREACH_CHECK: "sla-breach-check",
  INVOICE_OVERDUE_CHECK: "invoice-overdue-check",
  COORDINATOR_DIGEST: "coordinator-digest",
  SPAWN_RECURRING_TASKS: "spawn-recurring-tasks",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
