import { productRepository } from "./product.repository";
import { CreateProductInput, ListProductsQuery, UpdateProductInput } from "./product.validation";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const productService = {
  async list(ctx: ActorCtx, query: ListProductsQuery) {
    return productRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const product = await productRepository.findById(ctx.companyId, id);
    if (!product) throw ApiError.notFound("Product not found");
    return product;
  },

  async create(ctx: ActorCtx, input: CreateProductInput) {
    const existing = await productRepository.findBySku(ctx.companyId, input.sku);
    if (existing) throw ApiError.conflict(`A product with SKU "${input.sku}" already exists`);

    const product = await productRepository.create({
      company: { connect: { id: ctx.companyId } },
      sku: input.sku,
      name: input.name,
      category: input.category,
      brand: input.brand,
      description: input.description,
      unit: input.unit ?? "PCS",
      basePrice: input.basePrice,
      costPrice: input.costPrice ?? 0,
      currency: input.currency ?? "AED",
      isSerialized: input.isSerialized ?? false,
      reorderLevel: input.reorderLevel ?? 0,
      isActive: input.isActive ?? true,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Product",
      entityId: product.id,
      action: "CREATE",
      after: product,
    });

    return product;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateProductInput) {
    const existing = await productRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Product not found");

    if (input.sku && input.sku !== existing.sku) {
      const dup = await productRepository.findBySku(ctx.companyId, input.sku);
      if (dup) throw ApiError.conflict(`A product with SKU "${input.sku}" already exists`);
    }

    const updated = await productRepository.update(id, { ...input });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Product",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },
};
