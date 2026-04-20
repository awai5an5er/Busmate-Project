export const env = {
  websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "",
  firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  firebaseStorageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  firebaseMessagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  firebaseAppId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  firebaseVapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "",
  mongodbUri: process.env.MONGODB_URI ?? "",
  mongodbDbName: process.env.MONGODB_DB_NAME ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
};

export const hasFirebaseMessagingConfig = Boolean(
  env.firebaseApiKey &&
  env.firebaseAuthDomain &&
  env.firebaseProjectId &&
  env.firebaseMessagingSenderId &&
  env.firebaseAppId,
);
