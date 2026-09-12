import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export async function writeAuditLog(params: {
  actorId: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as any,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
