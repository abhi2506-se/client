"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ClientRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  country: string | null;
  assignedAgent: { user: { name: string } } | null;
  projects: { id: string; name: string; status: string }[];
  createdAt: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load(query = "") {
    setLoading(true);
    const res = await fetch(`/api/clients${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    const data = await res.json();
    setClients(data.clients ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--navy-deep)" }}>Clients</h1>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{clients.length} total</p>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Search by name, email, company…"
            className="field-input w-64"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
          />
          <button className="btn-secondary" onClick={() => load(q)}>Search</button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Country</th>
              <th>Agent</th>
              <th>Projects</th>
              <th>Since</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-6" style={{ color: "var(--ink-muted)" }}>Loading…</td></tr>}
            {!loading && clients.length === 0 && (
              <tr><td colSpan={7} className="text-center py-6" style={{ color: "var(--ink-muted)" }}>No clients yet.</td></tr>
            )}
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">
                  <Link href={`/dashboard/clients/${c.id}`} className="hover:underline" style={{ color: "var(--navy)" }}>
                    {c.name}
                  </Link>
                </td>
                <td>{c.email}</td>
                <td>{c.company || "—"}</td>
                <td>{c.country || "—"}</td>
                <td>{c.assignedAgent?.user?.name || "Unassigned"}</td>
                <td>{c.projects.length}</td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
