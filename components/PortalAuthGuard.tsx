"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearClientAuthToken, getClientAuthToken } from "@/lib/clientAuthToken";

function decodeJwtRole(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
    const json = JSON.parse(atob(padded)) as { role?: string };
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

export function PortalAuthGuard({
  expectedRole,
  children,
}: {
  expectedRole: "student" | "driver" | "admin";
  children: ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useLayoutEffect(() => {
    const token = getClientAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const role = decodeJwtRole(token);
    if (!role) {
      clearClientAuthToken();
      router.replace("/login");
      return;
    }

    if (role !== expectedRole) {
      router.replace(`/${role}`);
      return;
    }

    setAllowed(true);
  }, [expectedRole, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
