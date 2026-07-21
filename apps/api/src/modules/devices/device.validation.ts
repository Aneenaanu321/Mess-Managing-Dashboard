import { z } from "zod";

export const deviceTypeEnum = z.enum([
  "READER",
  "ANTENNA",
  "GATE",
  "HANDHELD",
  "PRINTER",
  "TAG",
  "LABEL_APPLICATOR",
  "EAS_SYSTEM",
  "OTHER",
]);

export const deviceStatusEnum = z.enum(["IN_STOCK", "ALLOCATED", "INSTALLED", "FAULTY", "RETIRED", "RMA"]);

export const createDeviceSchema = z.object({
  serialNumber: z.string().min(1, "serialNumber is required"),
  type: deviceTypeEnum,
  productId: z.string().min(1, "productId is required"),
  siteId: z.string().optional(),
  projectId: z.string().optional(),
  firmwareVersion: z.string().optional(),
  location: z.string().optional(),
});
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;

export const updateDeviceSchema = z.object({
  status: deviceStatusEnum.optional(),
  siteId: z.string().optional(),
  projectId: z.string().optional(),
  firmwareVersion: z.string().optional(),
  location: z.string().optional(),
  configuration: z.any().optional(),
  installedAt: z.coerce.date().optional(),
});
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;

export const listDevicesQuerySchema = z.object({
  type: deviceTypeEnum.optional(),
  status: deviceStatusEnum.optional(),
  projectId: z.string().optional(),
  siteId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;
