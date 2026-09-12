import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export class AuthzError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

/** Throws if there's no authenticated, active session. Returns the session otherwise. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new AuthzError("Not authenticated", 401);
  if (session.user.status === "DISABLED") throw new AuthzError("Account disabled", 403);
  return session;
}

/** Throws unless the current user has one of the given roles. */
export async function requireRole(...roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new AuthzError("Insufficient permissions", 403);
  }
  return session;
}

/**
 * Core IDOR guard for a lead: Admin sees everything, an Agent only sees leads
 * assigned to them. This check happens against the database, not a client-supplied
 * flag, so a manually edited URL/id can never leak another agent's record.
 */
export async function assertCanAccessLead(leadId: string) {
  const session = await requireSession();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new AuthzError("Not found", 404);

  if (session.user.role === "ADMIN") return { session, lead };
  if (session.user.role === "AGENT" && lead.agentId === session.user.agentId) {
    return { session, lead };
  }
  throw new AuthzError("You do not have access to this lead", 403);
}

export async function assertCanAccessClient(clientId: string) {
  const session = await requireSession();
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AuthzError("Not found", 404);

  if (session.user.role === "ADMIN") return { session, client };
  if (session.user.role === "AGENT" && client.assignedAgentId === session.user.agentId) {
    return { session, client };
  }
  if (session.user.role === "CLIENT" && client.id === session.user.clientId) {
    return { session, client };
  }
  throw new AuthzError("You do not have access to this client", 403);
}

export async function assertCanAccessProject(projectId: string) {
  const session = await requireSession();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  });
  if (!project) throw new AuthzError("Not found", 404);

  if (session.user.role === "ADMIN") return { session, project };
  if (session.user.role === "AGENT" && project.assignedAgentId === session.user.agentId) {
    return { session, project };
  }
  if (session.user.role === "CLIENT" && project.clientId === session.user.clientId) {
    return { session, project };
  }
  throw new AuthzError("You do not have access to this project", 403);
}

/** Scopes a Prisma `where` clause for list endpoints so an agent only ever queries their own rows. */
export function leadScope(session: Awaited<ReturnType<typeof requireSession>>) {
  if (session.user.role === "ADMIN") return {};
  if (session.user.role === "AGENT") return { agentId: session.user.agentId };
  throw new AuthzError("Clients cannot list leads", 403);
}

export function clientScope(session: Awaited<ReturnType<typeof requireSession>>) {
  if (session.user.role === "ADMIN") return {};
  if (session.user.role === "AGENT") return { assignedAgentId: session.user.agentId };
  if (session.user.role === "CLIENT") return { id: session.user.clientId };
  return {};
}

export function projectScope(session: Awaited<ReturnType<typeof requireSession>>) {
  if (session.user.role === "ADMIN") return {};
  if (session.user.role === "AGENT") return { assignedAgentId: session.user.agentId };
  if (session.user.role === "CLIENT") return { clientId: session.user.clientId };
  return {};
}

export function toApiError(err: unknown) {
  if (err instanceof AuthzError) return { status: err.status, message: err.message };
  console.error(err);
  return { status: 500, message: "Internal server error" };
}
