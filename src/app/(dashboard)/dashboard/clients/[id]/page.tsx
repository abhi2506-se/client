import { prisma } from "@/lib/prisma";
import { assertCanAccessClient } from "@/lib/authz";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let client;
  try {
    await assertCanAccessClient(id);
    client = await prisma.client.findUnique({
      where: { id },
      include: {
        assignedAgent: { include: { user: true } },
        projects: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { createdAt: "desc" } },
        lead: true,
      },
    });
  } catch {
    notFound();
  }

  if (!client) notFound();

  return (
    <div className="max-w-4xl">
      <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--navy-deep)" }}>{client.name}</h1>
      <p className="text-xs mb-4" style={{ color: "var(--ink-muted)" }}>{client.email}</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="panel p-4">
          <div className="field-label">Company</div>
          <div className="text-sm">{client.company || "—"}</div>
        </div>
        <div className="panel p-4">
          <div className="field-label">Country</div>
          <div className="text-sm">{client.country || "—"}</div>
        </div>
        <div className="panel p-4">
          <div className="field-label">Assigned agent</div>
          <div className="text-sm">{client.assignedAgent?.user?.name || "Unassigned"}</div>
        </div>
      </div>

      {client.lead && (
        <div className="panel p-4 mb-6">
          <div className="field-label mb-1">Converted from lead</div>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Source: {client.lead.source || "—"} · Original notes: {client.lead.notes || "none"}
          </p>
        </div>
      )}

      <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--navy-deep)" }}>Projects</h2>
      <div className="panel overflow-x-auto mb-6">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Status</th><th>Value</th><th>Created</th></tr>
          </thead>
          <tbody>
            {client.projects.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6" style={{ color: "var(--ink-muted)" }}>No projects yet.</td></tr>
            )}
            {client.projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/dashboard/projects/${p.id}`} className="hover:underline" style={{ color: "var(--navy)" }}>
                    {p.name}
                  </Link>
                </td>
                <td>{p.projectType}</td>
                <td><span className="badge">{p.status.replace(/_/g, " ")}</span></td>
                <td>{p.totalValue ? `${p.currency} ${p.totalValue}` : "—"}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--navy-deep)" }}>Documents</h2>
      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>File</th><th>Type</th><th>Size</th><th>Uploaded</th></tr>
          </thead>
          <tbody>
            {client.documents.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6" style={{ color: "var(--ink-muted)" }}>No documents yet.</td></tr>
            )}
            {client.documents.map((d) => (
              <tr key={d.id}>
                <td>{d.filename}</td>
                <td>{d.documentType}</td>
                <td>{(d.sizeBytes / 1024).toFixed(0)} KB</td>
                <td>{new Date(d.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
