import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    services: {
      mongodbConfigured: Boolean(env.mongodbUri && env.mongodbDbName),
      firebaseConfigured: Boolean(
        env.firebaseApiKey &&
          env.firebaseAuthDomain &&
          env.firebaseProjectId &&
          env.firebaseMessagingSenderId &&
          env.firebaseAppId,
      ),
    },
  });
}
