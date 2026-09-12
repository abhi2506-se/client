"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type ProjectRow = {
  id: string;
  name: string;
  projectType: string;
  status: string;
  totalValue: string | null;
  currency: string;
  createdAt: string;
  client: { name: string; email: string };
};

const PROJECT_TYPES = [
  "Website", "Web App", "E-commerce", "Portfolio", "SaaS", "Mobile App",
  "UI/UX", "API/Backend", "AI Integration", "Automation", "Custom Software", "Other",
];

export default function ProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", projectType: "Website", description: "", targetAudience: "", budgetEstimate: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmitProject(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        budgetEstimate: form.budgetEstimate ? Number(form.budgetEstimate) : undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to submit project");
      return;
    }
    setShowForm(false);
    setForm({ name: "", projectType: "Website", description: "", targetAudience: "", budgetEstimate: "" });
    load();
  }

  const isClient = session?.user?.role === "CLIENT";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--navy-deep)" }}>Projects</h1>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{projects.length} total</p>
        </div>
        {isClient && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ Submit new project"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmitProject} className="panel p-4 mb-4 grid grid-cols-2 gap-3">
          {error && <p className="col-span-2 text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          <div>
            <label className="field-label">Project name *</label>
            <input required className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Project type *</label>
            <select className="field-input" value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })}>
              {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="field-label">Description *</label>
            <textarea required rows={4} className="field-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Target audience</label>
            <input className="field-input" value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Estimated budget</label>
            <input type="number" className="field-input" value={form.budgetEstimate} onChange={(e) => setForm({ ...form, budgetEstimate: e.target.value })} />
          </div>
          <div className="col-span-2">
            <button type="submit" className="btn-primary">Submit project request</button>
          </div>
        </form>
      )}

      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Project</th>
              {!isClient && <th>Client</th>}
              <th>Type</th>
              <th>Status</th>
              <th>Value</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center py-6" style={{ color: "var(--ink-muted)" }}>Loading…</td></tr>}
            {!loading && projects.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6" style={{ color: "var(--ink-muted)" }}>No projects yet.</td></tr>
            )}
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/dashboard/projects/${p.id}`} className="hover:underline" style={{ color: "var(--navy)" }}>
                    {p.name}
                  </Link>
                </td>
                {!isClient && <td>{p.client?.name}</td>}
                <td>{p.projectType}</td>
                <td><span className="badge">{p.status.replace(/_/g, " ")}</span></td>
                <td>{p.totalValue ? `${p.currency} ${p.totalValue}` : "—"}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
