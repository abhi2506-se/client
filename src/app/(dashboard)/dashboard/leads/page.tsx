"use client";

import { useEffect, useState } from "react";

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  score: number;
  createdAt: string;
  agent: { user: { name: string } } | null;
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "#0e3a5f",
  CONTACTED: "#4a5568",
  REPLIED: "#1e6b3c",
  QUALIFIED: "#b7862b",
  PROPOSAL_SENT: "#7c3aed",
  NEGOTIATION: "#c2410c",
  WON: "#1e6b3c",
  LOST: "#b3261e",
  CONVERTED: "#0e3a5f",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", country: "", source: "" });
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create lead");
      return;
    }
    setForm({ name: "", email: "", phone: "", company: "", country: "", source: "" });
    setShowForm(false);
    load();
  }

  async function handleConvert(id: string) {
    setConverting(id);
    const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" });
    setConverting(null);
    if (res.ok) load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--navy-deep)" }}>Leads</h1>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{leads.length} total</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New lead"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="panel p-4 mb-4 grid grid-cols-3 gap-3">
          {error && <p className="col-span-3 text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          <div>
            <label className="field-label">Name *</label>
            <input required className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Email *</label>
            <input required type="email" className="field-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Phone</label>
            <input className="field-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Company</label>
            <input className="field-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Country</label>
            <input className="field-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Source</label>
            <input className="field-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </div>
          <div className="col-span-3">
            <button type="submit" className="btn-primary">Save lead</button>
          </div>
        </form>
      )}

      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Score</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-6" style={{ color: "var(--ink-muted)" }}>Loading…</td></tr>
            )}
            {!loading && leads.length === 0 && (
              <tr><td colSpan={8} className="text-center py-6" style={{ color: "var(--ink-muted)" }}>No leads yet. Create your first one.</td></tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="font-medium">{lead.name}</td>
                <td>{lead.email}</td>
                <td>{lead.company || "—"}</td>
                <td>{lead.agent?.user?.name || "Unassigned"}</td>
                <td>
                  <span className="badge" style={{ color: STATUS_COLORS[lead.status], borderColor: STATUS_COLORS[lead.status] }}>
                    {lead.status.replace("_", " ")}
                  </span>
                </td>
                <td>{lead.score}</td>
                <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                <td>
                  {lead.status !== "CONVERTED" && (
                    <button
                      className="btn-secondary text-xs px-2 py-1"
                      disabled={converting === lead.id}
                      onClick={() => handleConvert(lead.id)}
                    >
                      {converting === lead.id ? "Converting…" : "Convert to client"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
