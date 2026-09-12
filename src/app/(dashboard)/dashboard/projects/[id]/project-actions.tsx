"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_STEPS: Record<string, string[]> = {
  SUBMITTED: ["PAYMENT_PENDING", "REJECTED"],
  PAYMENT_PENDING: ["PAYMENT_RECEIVED", "REJECTED"],
  PAYMENT_RECEIVED: ["WAITING_FOR_REVIEW"],
  WAITING_FOR_REVIEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PLANNING"],
  PLANNING: ["UI_UX"],
  UI_UX: ["DEVELOPMENT"],
  DEVELOPMENT: ["TESTING"],
  TESTING: ["CLIENT_REVIEW"],
  CLIENT_REVIEW: ["DEVELOPMENT", "FINAL_DELIVERY"],
  FINAL_DELIVERY: ["COMPLETED"],
};

export function ProjectActions({ projectId, currentStatus }: { projectId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const options = NEXT_STEPS[currentStatus] || [];

  async function transition(status: string) {
    if (status === "REJECTED" && !confirm("Reject this project? This should trigger the refund workflow.")) return;
    setLoading(status);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
    else alert((await res.json()).error || "Failed to update status");
  }

  if (options.length === 0) return null;

  return (
    <div className="panel p-3 flex gap-2">
      <span className="text-xs self-center" style={{ color: "var(--ink-muted)" }}>Move to:</span>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => transition(opt)}
          disabled={loading === opt}
          className={opt === "REJECTED" ? "btn-secondary text-xs px-3 py-1.5" : "btn-primary text-xs px-3 py-1.5"}
          style={opt === "REJECTED" ? { color: "var(--danger)", borderColor: "var(--danger)" } : undefined}
        >
          {loading === opt ? "Updating…" : opt.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}
