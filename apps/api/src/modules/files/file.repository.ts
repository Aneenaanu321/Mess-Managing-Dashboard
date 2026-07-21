import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export const fileRepository = {
  list(companyId: string, entityType: string, entityId: string) {
    return prisma.fileAsset.findMany({
      where: { companyId, entityType, entityId },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(companyId: string, id: string) {
    return prisma.fileAsset.findFirst({ where: { id, companyId } });
  },

  async nextVersion(companyId: string, entityType: string, entityId: string, fileName: string) {
    const latest = await prisma.fileAsset.findFirst({
      where: { companyId, entityType, entityId, fileName },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  },

  create(data: Prisma.FileAssetCreateInput) {
    return prisma.fileAsset.create({ data });
  },
};
