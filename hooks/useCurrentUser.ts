"use client";

import axios from "axios";
import { useEffect, useState } from "react";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "student" | "driver" | "admin";
  studentId?: string;
  driverId?: string;
  isActive: boolean;
  createdAt: string;
};

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get<{ user: CurrentUser }>("/api/auth/me");
        if (!cancelled) {
          setUser(data.user);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load user");
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, error };
};
