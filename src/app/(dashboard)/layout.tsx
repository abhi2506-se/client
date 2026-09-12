import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "AGENT", "CLIENT"] },
  { href: "/dashboard/leads", label: "Leads", roles: ["ADMIN", "AGENT"] },
  { href: "/dashboard/clients", label: "Clients", roles: ["ADMIN", "AGENT"] },
  { href: "/dashboard/projects", label: "Projects", roles: ["ADMIN", "AGENT", "CLIENT"] },
  { href: "/dashboard/agents", label: "Agents", roles: ["ADMIN"] },
  { href: "/dashboard/audit-logs", label: "Audit Logs", roles: ["ADMIN"] },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand px-5 py-4">
          <div className="text-white font-semibold text-sm">Agency Platform</div>
          <div className="text-[11px]" style={{ color: "#9fb3c8" }}>
            {role === "ADMIN" ? "Administrator" : role === "AGENT" ? "Agent workspace" : "Client portal"}
          </div>
        </div>
        <nav className="app-nav py-2">
          {NAV.filter((item) => item.roles.includes(role)).map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-col min-h-screen">
        <header className="app-topbar px-6 py-3 flex items-center justify-between">
          <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            {session.user.name}
            <span className="ml-2 badge" style={{ color: "var(--navy)" }}>
              {role}
            </span>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn-secondary text-xs px-3 py-1.5">
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 p-6" style={{ background: "var(--slate-bg)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
