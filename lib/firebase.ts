import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";
import { env, hasFirebaseMessagingConfig } from "./env";

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
  messagingSenderId: env.firebaseMessagingSenderId,
  appId: env.firebaseAppId,
};

let firebaseApp: ReturnType<typeof initializeApp> | null = null;

export const getFirebaseApp = () => {
  if (!hasFirebaseMessagingConfig) return null;
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }
  return firebaseApp;
};

export const getFirebaseMessaging = async () => {
  const app = getFirebaseApp();
  if (!app) return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  return getMessaging(app);
};
