import { prisma } from "@/lib/prisma";
import { assertCanAccessProject } from "@/lib/authz";
import { notFound } from "next/navigation";
import { ProjectActions } from "./project-actions";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let session;
  let project;
  try {
    const result = await assertCanAccessProject(id);
    session = result.session;
    project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        assignedAgent: { include: { user: true } },
        milestones: { orderBy: { createdAt: "asc" } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
  } catch {
    notFound();
  }

  if (!project) notFound();

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--navy-deep)" }}>{project.name}</h1>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {project.client.name} · {project.projectType}
          </p>
        </div>
        <span className="badge text-sm px-3 py-1">{project.status.replace(/_/g, " ")}</span>
      </div>

      {session!.user.role === "ADMIN" && (
        <ProjectActions projectId={project.id} currentStatus={project.status} />
      )}

      <div className="panel p-4 my-6">
        <div className="field-label mb-1">Description</div>
        <p className="text-sm whitespace-pre-wrap">{project.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="panel p-4">
          <div className="field-label">Total value</div>
          <div className="text-sm">{project.totalValue ? `${project.currency} ${project.totalValue}` : "Not set"}</div>
        </div>
        <div className="panel p-4">
          <div className="field-label">Advance</div>
          <div className="text-sm">{project.advanceAmount ? `${project.currency} ${project.advanceAmount}` : "Not set"}</div>
        </div>
        <div className="panel p-4">
          <div className="field-label">Assigned agent</div>
          <div className="text-sm">{project.assignedAgent?.user?.name || "Unassigned"}</div>
        </div>
      </div>

      <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--navy-deep)" }}>Milestones</h2>
      <div className="panel overflow-x-auto mb-6">
        <table className="data-table">
          <thead><tr><th>Name</th><th>%</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>
            {project.milestones.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6" style={{ color: "var(--ink-muted)" }}>No milestones defined yet.</td></tr>
            )}
            {project.milestones.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.percentage}%</td>
                <td><span className="badge">{m.status.replace(/_/g, " ")}</span></td>
                <td>{m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--navy-deep)" }}>Activity timeline</h2>
      <div className="panel p-4">
        <ol className="space-y-2">
          {project.statusHistory.map((h) => (
            <li key={h.id} className="text-xs flex gap-3">
              <span style={{ color: "var(--ink-muted)" }}>{new Date(h.createdAt).toLocaleString()}</span>
              <span>{h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : `Created as ${h.toStatus}`}</span>
              {h.note && <span style={{ color: "var(--ink-muted)" }}>— {h.note}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
