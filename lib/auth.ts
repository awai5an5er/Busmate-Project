import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import dbConnect from "./mongodb";
import { User, IUser } from "@/models";
import { env } from "./env";

const JWT_SECRET = env.jwtSecret || "your-secret-key";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthResult {
  user: IUser | null;
  error: string | null;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

/** Prefer `Authorization: Bearer` (per-tab); fall back to cookie for older sessions. */
export function getTokenFromRequest(request: NextRequest): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  return request.cookies.get("token")?.value ?? undefined;
}

export async function getCurrentUser(
  request: NextRequest,
): Promise<AuthResult> {
  try {
    await dbConnect();

    const token = getTokenFromRequest(request);

    if (!token) {
      return { user: null, error: "No token provided" };
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return { user: null, error: "Invalid token" };
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return { user: null, error: "User not found or inactive" };
    }

    return { user, error: null };
  } catch {
    return { user: null, error: "Authentication failed" };
  }
}

export function generateToken(
  userId: string,
  email: string,
  role: string,
): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: "7d" });
}
