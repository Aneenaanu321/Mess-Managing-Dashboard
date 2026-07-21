import { z } from "zod";

export const productCategoryEnum = z.enum([
  "RFID_READER",
  "RFID_ANTENNA",
  "RFID_GATE",
  "RFID_HANDHELD",
  "RFID_PRINTER",
  "RFID_TAG",
  "RFID_LABEL",
  "RFID_SOFTWARE",
  "LOSS_PREVENTION",
  "EAS_SYSTEM",
  "MARKING_CODING",
  "BARCODE",
  "WAREHOUSE_AUTOMATION",
  "ASSET_TRACKING",
  "CLOUD_LICENSE",
  "SERVICE_INSTALLATION",
  "SERVICE_TRAINING",
  "SERVICE_AMC",
  "OTHER",
]);

export const createProductSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  category: productCategoryEnum,
  brand: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1).optional(),
  basePrice: z.coerce.number().nonnegative("basePrice must be a non-negative number"),
  costPrice: z.coerce.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  isSerialized: z.boolean().optional(),
  reorderLevel: z.coerce.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const listProductsQuerySchema = z.object({
  category: productCategoryEnum.optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
