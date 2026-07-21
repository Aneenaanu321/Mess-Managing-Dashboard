import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, s3Bucket, ensureBucket } from "../../config/s3";
import { fileRepository } from "./file.repository";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";
import { PERMISSIONS } from "../../config/permissions";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
  permissions: string[];
}

/**
 * FileAsset attaches to any entity by free-form (entityType, entityId), so
 * unlike every other module here there's no single owning route to inherit a
 * permission check from. This maps each entity type this pass actually wires
 * up to the view/manage permission that already gates that entity elsewhere
 * — an unmapped entityType is denied by default rather than silently open.
 */
const ENTITY_PERMISSIONS: Record<string, { view: string; manage: string }> = {
  CustomerPO: { view: PERMISSIONS.CUSTOMER_PO_VIEW, manage: PERMISSIONS.CUSTOMER_PO_CREATE },
};

function requireEntityPermission(ctx: ActorCtx, entityType: string, action: "view" | "manage") {
  const mapping = ENTITY_PERMISSIONS[entityType];
  if (!mapping) throw ApiError.badRequest(`Unsupported entityType: ${entityType}`);
  const required = mapping[action];
  if (!ctx.permissions.includes(PERMISSIONS.ALL) && !ctx.permissions.includes(required)) {
    throw ApiError.forbidden(`Missing required permission: ${required}`);
  }
}

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export const fileService = {
  list(ctx: ActorCtx, entityType: string, entityId: string) {
    requireEntityPermission(ctx, entityType, "view");
    return fileRepository.list(ctx.companyId, entityType, entityId);
  },

  async upload(ctx: ActorCtx, entityType: string, entityId: string, file: UploadedFile) {
    requireEntityPermission(ctx, entityType, "manage");
    await ensureBucket();

    const fileName = sanitizeFileName(file.originalname);
    const version = await fileRepository.nextVersion(ctx.companyId, entityType, entityId, fileName);
    const key = `${ctx.companyId}/${entityType}/${entityId}/${Date.now()}-${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const asset = await fileRepository.create({
      companyId: ctx.companyId,
      entityType,
      entityId,
      fileName,
      url: key,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      version,
      uploadedById: ctx.userId,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "FileAsset",
      entityId: asset.id,
      action: "CREATE",
      after: { fileName, entityType, entityId, version, sizeBytes: file.size },
    });

    return asset;
  },

  async getDownloadUrl(ctx: ActorCtx, id: string) {
    const asset = await fileRepository.findById(ctx.companyId, id);
    if (!asset) throw ApiError.notFound("File not found");
    requireEntityPermission(ctx, asset.entityType, "view");

    const url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: s3Bucket, Key: asset.url }), { expiresIn: 300 });
    return { url, fileName: asset.fileName };
  },
};
