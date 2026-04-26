"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearClientAuthToken } from "@/lib/clientAuthToken";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    clearClientAuthToken();

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoading(false);
      router.push("/login");
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="rounded-lg border border-amber-400/30 bg-amber-500/20 px-3 py-2 text-sm text-amber-200 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? "Signing out..." : "Logout"}
    </button>
  );
}
