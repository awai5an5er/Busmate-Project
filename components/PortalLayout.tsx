import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { PortalAuthGuard } from "./PortalAuthGuard";

export function PortalLayout({
  role,
  children,
}: {
  role: "student" | "driver" | "admin";
  children: ReactNode;
}) {
  return (
    <PortalAuthGuard expectedRole={role}>
      <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-5 flex flex-col gap-4 rounded-2xl bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                BusMate Portal
              </p>
              <h1 className="text-xl font-bold text-slate-900">{role}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
              >
                Back to landing
              </Link>
              <LogoutButton />
            </div>
          </header>
          {children}
        </div>
      </main>
    </PortalAuthGuard>
  );
}
