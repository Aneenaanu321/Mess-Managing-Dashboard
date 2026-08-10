import { z } from "zod";

export const taskStatusEnum = z.enum(["TODO", "SEEN", "IN_PROGRESS", "SUBMITTED", "BLOCKED", "DONE"]);
export const taskJobTypeEnum = z.enum([
  "DELIVERY",
  "CHEQUE_COLLECTION",
  "DOCUMENT_PICKUP",
  "SITE_VISIT",
  "INSTALLATION",
  "EXPORT_SHIPMENT",
  "IMPORT_RECEIVING",
  "OTHER",
]);
export const paymentMethodEnum = z.enum(["BANK_TRANSFER", "CHEQUE", "CASH", "CARD", "ONLINE"]);

const sopSectionSchema = z.record(z.string(), z.boolean()).optional();

export const sopChecklistSchema = z
  .object({
    preDay: sopSectionSchema,
    warehouse: sopSectionSchema,
    visit: sopSectionSchema,
    docs: sopSectionSchema,
    eod: sopSectionSchema,
  })
  .partial();

export const packingDetailsSchema = z
  .object({
    itemCount: z.coerce.number().int().nonnegative().optional(),
    items: z
      .array(
        z.object({
          name: z.string().min(1),
          weight: z.coerce.number().nonnegative().nullable().optional(),
        }),
      )
      .optional(),
    pallets: z
      .array(
        z.object({
          label: z.string().optional(),
          itemNames: z.string().optional(),
          weight: z.coerce.number().nonnegative().nullable().optional(),
        }),
      )
      .optional(),
    totalPalletWeight: z.coerce.number().nonnegative().nullable().optional(),
    notes: z.string().optional(),
  })
  .partial();

export const createTaskSchema = z
  .object({
    title: z.string().optional().default(""),
    projectId: z.string().optional(),
    salesOrderId: z.string().optional(),
    customerPoId: z.string().optional(),
    invoiceId: z.string().optional(),
    assigneeId: z.string().optional(),
    description: z.string().optional(),
    dueAt: z.coerce.date().optional(),
    jobType: taskJobTypeEnum.optional(),
    scheduleOrder: z.coerce.number().int().min(0).optional(),
    /** Create a recurring template that keeps spawning jobs. */
    recurrence: z
      .object({
        cadence: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
        dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasLink = Boolean(data.salesOrderId || data.customerPoId || data.invoiceId || data.projectId);
    if (!data.title?.trim() && !hasLink) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "title is required unless you link an order/PO/invoice",
        path: ["title"],
      });
    }
  });
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: taskStatusEnum.optional(),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
  dueAt: z.coerce.date().optional(),
  jobType: taskJobTypeEnum.optional(),
  scheduleOrder: z.coerce.number().int().min(0).optional(),
  projectId: z.string().nullable().optional(),
  salesOrderId: z.string().nullable().optional(),
  customerPoId: z.string().nullable().optional(),
  invoiceId: z.string().nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const submitTaskSchema = z.object({
  completionNote: z.string().min(1, "Completion note is required"),
  paymentAmount: z.coerce.number().nonnegative().optional(),
  paymentMethod: paymentMethodEnum.optional(),
  paymentReference: z.string().optional(),
  /** Allow final checklist tick on submit */
  sopChecklist: sopChecklistSchema.optional(),
  packingDetails: packingDetailsSchema.optional(),
});
export type SubmitTaskInput = z.infer<typeof submitTaskSchema>;

export const verifyTaskSchema = z.object({
  note: z.string().optional(),
});
export type VerifyTaskInput = z.infer<typeof verifyTaskSchema>;

export const updateSopSchema = z.object({
  sopChecklist: sopChecklistSchema.optional(),
  packingDetails: packingDetailsSchema.optional(),
  customerNotified: z.boolean().optional(),
  scheduleOrder: z.coerce.number().int().min(0).optional(),
  /** When true and the job is linked to a sales order, reserve stock via allocate(). */
  reserveStock: z.boolean().optional(),
  warehouseId: z.string().optional(),
});
export type UpdateSopInput = z.infer<typeof updateSopSchema>;

export const taskSignOffSchema = z.object({
  name: z.string().min(1, "Signer name is required"),
  document: z.enum(["DO", "INVOICE", "BOTH"]).default("DO"),
  /** PNG/JPEG data URL from signature pad */
  signatureDataUrl: z.string().min(32).optional(),
});
export type TaskSignOffInput = z.infer<typeof taskSignOffSchema>;

export const reportIncompleteSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  rescheduleDate: z.coerce.date().optional(),
});
export type ReportIncompleteInput = z.infer<typeof reportIncompleteSchema>;

export const listTasksQuerySchema = z.object({
  status: taskStatusEnum.optional(),
  jobType: taskJobTypeEnum.optional(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  assignedByMe: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  awaitingVerify: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const fieldDayQuerySchema = z.object({
  date: z.string().optional(), // YYYY-MM-DD
  assigneeId: z.string().optional(),
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});
export type FieldDayQuery = z.infer<typeof fieldDayQuerySchema>;

export const returnOriginalsDaySchema = z.object({
  date: z.string().optional(), // YYYY-MM-DD — board date; defaults to today
  assigneeId: z.string().optional(),
  mine: z.boolean().optional().default(true),
});
export type ReturnOriginalsDayInput = z.infer<typeof returnOriginalsDaySchema>;

export const reorderFieldDaySchema = z.object({
  date: z.string().optional(),
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderFieldDayInput = z.infer<typeof reorderFieldDaySchema>;

export const sopComplianceQuerySchema = z.object({
  date: z.string().optional(), // YYYY-MM-DD — filters by dueDate day; omit = all open + recent
  days: z.coerce.number().int().min(1).max(90).default(14),
  assigneeId: z.string().optional(),
  jobType: taskJobTypeEnum.optional(),
  issue: z
    .enum(["missingScans", "incompleteChecklist", "originalsPending", "urgentStock", "blocked", "any"])
    .optional()
    .default("any"),
});
export type SopComplianceQuery = z.infer<typeof sopComplianceQuerySchema>;
