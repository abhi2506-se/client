import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCanAccessProject, toApiError, AuthzError } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit";
import type { ProjectStatus } from "@prisma/client";

// Only these forward transitions are legal — prevents e.g. jumping straight
// from SUBMITTED to COMPLETED, or resurrecting a REJECTED project.
const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  SUBMITTED: ["PAYMENT_PENDING", "REJECTED"],
  PAYMENT_PENDING: ["PAYMENT_RECEIVED", "REJECTED"],
  PAYMENT_RECEIVED: ["WAITING_FOR_REVIEW"],
  WAITING_FOR_REVIEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PLANNING"],
  REJECTED: [],
  PLANNING: ["UI_UX"],
  UI_UX: ["DEVELOPMENT"],
  DEVELOPMENT: ["TESTING"],
  TESTING: ["CLIENT_REVIEW"],
  CLIENT_REVIEW: ["DEVELOPMENT", "FINAL_DELIVERY"],
  FINAL_DELIVERY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const transitionSchema = z.object({
  status: z.enum([
    "PAYMENT_PENDING",
    "PAYMENT_RECEIVED",
    "WAITING_FOR_REVIEW",
    "ACCEPTED",
    "REJECTED",
    "PLANNING",
    "UI_UX",
    "DEVELOPMENT",
    "TESTING",
    "CLIENT_REVIEW",
    "FINAL_DELIVERY",
    "COMPLETED",
  ]),
  note: z.string().max(2000).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { project } = await assertCanAccessProject(id);
    const full = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        client: true,
        assignedAgent: { include: { user: true } },
        milestones: { orderBy: { createdAt: "asc" } },
        documents: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    return NextResponse.json({ project: full });
  } catch (err) {
    const { status, message } = toApiError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, project } = await assertCanAccessProject(id);

    // Status transitions (accept/reject/move stage) are Admin-only.
    if (session.user.role !== "ADMIN") {
      throw new AuthzError("Only Admin can change project status", 403);
    }

    const { status: newStatus, note } = transitionSchema.parse(await req.json());
    const allowed = ALLOWED_TRANSITIONS[project.status];

    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot move from ${project.status} to ${newStatus}` },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.project.update({
        where: { id: project.id },
        data: { status: newStatus },
      });
      await tx.projectStatusHistory.create({
        data: {
          projectId: project.id,
          fromStatus: project.status,
          toStatus: newStatus,
          changedById: session.user.id,
          note,
        },
      });
      return p;
    });

    await writeAuditLog({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "project.status_changed",
      entityType: "Project",
      entityId: project.id,
      metadata: { from: project.status, to: newStatus, note },
    });

    // NOTE: REJECTED transition should trigger the refund workflow — wired in
    // the Payments phase where the Razorpay refund API call and Refund record live.

    return NextResponse.json({ project: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.flatten() }, { status: 400 });
    }
    const { status, message } = toApiError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
