import { useEffect } from "react";
import { useBusMateStore } from "../store/useBusMateStore";
import { env } from "../lib/env";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeIncomingBus = (payload, fallbackBus) => {
  const lat = payload?.position?.lat ?? payload?.lat ?? fallbackBus.position.lat;
  const lng = payload?.position?.lng ?? payload?.lng ?? fallbackBus.position.lng;
  const isLiveFromPayload =
    payload?.isLive ?? (payload?.status ? payload.status === "live" : undefined);

  return {
    eta: payload?.eta ?? fallbackBus.eta,
    isLive: isLiveFromPayload ?? fallbackBus.isLive,
    position: {
      x:
        payload?.position?.x ??
        clamp(fallbackBus.position.x + (Math.random() * 8 - 4), 5, 95),
      y:
        payload?.position?.y ??
        clamp(fallbackBus.position.y + (Math.random() * 8 - 4), 8, 92),
      lat,
      lng,
    },
  };
};

export const useRealtimeBusFeed = () => {
  const buses = useBusMateStore((state) => state.buses);
  const updateBusFromFeed = useBusMateStore((state) => state.updateBusFromFeed);
  const setLoadingAdminTable = useBusMateStore((state) => state.setLoadingAdminTable);
  const pushNotification = useBusMateStore((state) => state.pushNotification);

  useEffect(() => {
    const tableTimer = setTimeout(() => setLoadingAdminTable(false), 1300);
    return () => clearTimeout(tableTimer);
  }, [setLoadingAdminTable]);

  useEffect(() => {
    if (!env.websocketUrl) {
      // Fallback local simulation when no backend socket is configured.
      const interval = setInterval(() => {
        buses.forEach((bus) => {
          const nextX = clamp(bus.position.x + (Math.random() * 8 - 4), 5, 95);
          const nextY = clamp(bus.position.y + (Math.random() * 8 - 4), 8, 92);
          const nextEta = Math.max(2, bus.eta + Math.floor(Math.random() * 3) - 1);
          updateBusFromFeed(bus.id, {
            eta: nextEta,
            isLive: Math.random() > 0.08,
            position: {
              x: nextX,
              y: nextY,
              lat: bus.position.lat + (Math.random() * 0.0016 - 0.0008),
              lng: bus.position.lng + (Math.random() * 0.0016 - 0.0008),
            },
          });
        });
      }, 2400);

      return () => clearInterval(interval);
    }

    const socket = new WebSocket(env.websocketUrl);

    socket.addEventListener("open", () => {
      pushNotification("WebSocket connected. Live bus tracking started.", "success");
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        const incomingItems = Array.isArray(payload) ? payload : [payload];

        incomingItems.forEach((item) => {
          const busId = item.id ?? item.busId;
          const fallbackBus = buses.find((bus) => bus.id === busId);
          if (!fallbackBus) return;
          updateBusFromFeed(busId, normalizeIncomingBus(item, fallbackBus));
        });
      } catch {
        pushNotification("Received malformed live tracking payload.", "error");
      }
    });

    socket.addEventListener("close", () => {
      pushNotification("WebSocket disconnected. Reverting to local simulation.", "warning");
    });

    socket.addEventListener("error", () => {
      pushNotification("WebSocket connection error.", "error");
    });

    return () => {
      socket.close();
    };
  }, [buses, pushNotification, updateBusFromFeed]);
};
