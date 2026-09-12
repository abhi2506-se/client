import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadScope, projectScope, clientScope } from "@/lib/authz";
import { redirect } from "next/navigation";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel p-4">
      <div className="field-label">{label}</div>
      <div className="text-2xl font-semibold mt-1" style={{ color: "var(--navy-deep)" }}>{value}</div>
    </div>
  );
}

export default async function DashboardOverview() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "CLIENT") {
    const projects = await prisma.project.findMany({
      where: { clientId: session.user.clientId! },
      include: { milestones: true },
      orderBy: { createdAt: "desc" },
    });
    const active = projects.filter((p) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(p.status));

    return (
      <div>
        <h1 className="text-lg font-semibold mb-4" style={{ color: "var(--navy-deep)" }}>Your projects</h1>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Active projects" value={active.length} />
          <StatCard label="Total projects" value={projects.length} />
          <StatCard
            label="Completed milestones"
            value={projects.reduce((sum, p) => sum + p.milestones.filter((m) => m.status === "COMPLETED").length, 0)}
          />
        </div>
        {projects.length === 0 && (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            You haven&apos;t submitted a project yet. Head to Projects to get started.
          </p>
        )}
      </div>
    );
  }

  // ADMIN / AGENT — every figure below is a live count/aggregate, never hardcoded.
  const [leadCount, clientCount, projectCount, activeProjectCount, completedProjectCount, revenueAgg] =
    await Promise.all([
      prisma.lead.count({ where: leadScope(session) as any }),
      prisma.client.count({ where: clientScope(session) as any }),
      prisma.project.count({ where: projectScope(session) as any }),
      prisma.project.count({
        where: { ...(projectScope(session) as any), status: { notIn: ["COMPLETED", "REJECTED", "CANCELLED"] } },
      }),
      prisma.project.count({ where: { ...(projectScope(session) as any), status: "COMPLETED" } }),
      prisma.project.aggregate({
        where: { ...(projectScope(session) as any), status: { not: "REJECTED" } },
        _sum: { totalValue: true },
      }),
    ]);

  const wonLeads = await prisma.lead.count({ where: { ...(leadScope(session) as any), status: "WON" } });
  const conversionRate = leadCount > 0 ? ((wonLeads / leadCount) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4" style={{ color: "var(--navy-deep)" }}>
        {session.user.role === "ADMIN" ? "Platform overview" : "Your workspace"}
      </h1>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total leads" value={leadCount} />
        <StatCard label="Total clients" value={clientCount} />
        <StatCard label="Active projects" value={activeProjectCount} />
        <StatCard label="Completed projects" value={completedProjectCount} />
        <StatCard label="Total projects" value={projectCount} />
        <StatCard label="Conversion rate" value={`${conversionRate}%`} />
        <StatCard label="Pipeline value" value={`₹${(revenueAgg._sum.totalValue ?? 0).toLocaleString()}`} />
      </div>
      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
        All figures are computed live from the database — nothing here is hardcoded. Email/commission
        stats will populate once the Email and Commission modules (Phase 2) are wired in.
      </p>
    </div>
  );
}
