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

export const createTaskSchema = z.object({
  title: z.string().min(1, "title is required"),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
  dueAt: z.coerce.date().optional(),
  jobType: taskJobTypeEnum.optional(),
  scheduleOrder: z.coerce.number().int().min(0).optional(),
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
});
export type UpdateSopInput = z.infer<typeof updateSopSchema>;

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
