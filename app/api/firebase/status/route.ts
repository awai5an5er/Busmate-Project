import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  const isConfigured = Boolean(
    env.firebaseApiKey &&
      env.firebaseAuthDomain &&
      env.firebaseProjectId &&
      env.firebaseMessagingSenderId &&
      env.firebaseAppId,
  );

  return NextResponse.json({
    configured: isConfigured,
    projectId: env.firebaseProjectId || null,
  });
}
