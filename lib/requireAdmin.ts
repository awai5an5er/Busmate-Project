import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { IUser } from "@/models";

export async function requireAdmin(
  request: NextRequest,
): Promise<{ user: IUser; response: null } | { user: null; response: NextResponse }> {
  const { user, error } = await getCurrentUser(request);
  if (error || !user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (user.role !== "admin") {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}
