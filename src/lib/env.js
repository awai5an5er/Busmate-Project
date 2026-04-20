export const env = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL ?? "",
  firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  firebaseMessagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  firebaseAppId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  firebaseVapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "",
};

export const hasGoogleMapsKey = Boolean(env.googleMapsApiKey);
export const hasFirebaseMessagingConfig = Boolean(
  env.firebaseApiKey &&
    env.firebaseAuthDomain &&
    env.firebaseProjectId &&
    env.firebaseMessagingSenderId &&
    env.firebaseAppId,
);
