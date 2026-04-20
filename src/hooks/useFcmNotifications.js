import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { useBusMateStore } from "../store/useBusMateStore";
import { env, hasFirebaseMessagingConfig } from "../lib/env";
import { getFirebaseMessaging } from "../lib/firebase";

const alerts = [
  { message: "Route R-200 delayed by 5 minutes due to traffic.", type: "warning" },
  { message: "Campus Loop A reached Main Gate.", type: "success" },
  { message: "Network sync restored. Live feed is healthy.", type: "info" },
];

export const useFcmNotifications = () => {
  const pushNotification = useBusMateStore((state) => state.pushNotification);

  useEffect(() => {
    let unsubscribe = () => {};

    const fallbackInterval = setInterval(() => {
      if (hasFirebaseMessagingConfig || Math.random() < 0.55) return;
      const alert = alerts[Math.floor(Math.random() * alerts.length)];
      pushNotification(alert.message, alert.type);
    }, 6500);

    const setupMessaging = async () => {
      if (!hasFirebaseMessagingConfig || !("Notification" in window)) {
        return;
      }

      const permission = await Notification.requestPermission().catch(() => "default");
      if (permission !== "granted") {
        pushNotification("Notification permission not granted.", "warning");
        return;
      }

      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        pushNotification("Firebase messaging is not supported in this browser.", "warning");
        return;
      }

      try {
        await getToken(messaging, {
          vapidKey: env.firebaseVapidKey || undefined,
          serviceWorkerRegistration: await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
          ),
        });
      } catch {
        pushNotification("Unable to register device for push notifications.", "error");
      }

      unsubscribe = onMessage(messaging, (payload) => {
        const message =
          payload.notification?.body ??
          payload.data?.message ??
          "New BusMate notification received.";
        const type = payload.data?.type ?? "info";
        pushNotification(message, type);
      });
    };

    setupMessaging();

    return () => {
      clearInterval(fallbackInterval);
      unsubscribe();
    };
  }, [pushNotification]);
};
