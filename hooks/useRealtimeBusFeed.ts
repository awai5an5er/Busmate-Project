"use client";

import { useEffect } from "react";
import { useBusMateStore } from "@/store/useBusMateStore";
import type { Bus } from "@/types/busmate";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function normalizeFeedItem(item: Record<string, unknown>): Partial<Bus> {
  const {
    id: _id,
    busId: _bid,
    lat,
    lng,
    latitude,
    longitude,
    position,
    ...rest
  } = item;

  const latN =
    (typeof lat === "number" ? lat : undefined) ??
    (typeof latitude === "number" ? latitude : undefined) ??
    (position && typeof position === "object" && position !== null
      ? (position as { lat?: number }).lat
      : undefined);
  const lngN =
    (typeof lng === "number" ? lng : undefined) ??
    (typeof longitude === "number" ? longitude : undefined) ??
    (position && typeof position === "object" && position !== null
      ? (position as { lng?: number }).lng
      : undefined);

  const basePos =
    position && typeof position === "object" && position !== null
      ? (position as Bus["position"])
      : { x: 50, y: 50, lat: 0, lng: 0 };

  if (latN != null && lngN != null) {
    return {
      ...(rest as Partial<Bus>),
      eta: typeof rest.eta === "number" ? rest.eta : undefined,
      isLive: typeof rest.isLive === "boolean" ? rest.isLive : undefined,
      position: {
        ...basePos,
        lat: Number(latN),
        lng: Number(lngN),
        x: typeof rest.x === "number" ? (rest.x as number) : basePos.x,
        y: typeof rest.y === "number" ? (rest.y as number) : basePos.y,
      },
    };
  }

  return rest as Partial<Bus>;
}

export const useRealtimeBusFeed = () => {
  const updateBusFromFeed = useBusMateStore((state) => state.updateBusFromFeed);
  const setLoadingAdminTable = useBusMateStore((state) => state.setLoadingAdminTable);
  const pushNotification = useBusMateStore((state) => state.pushNotification);
  const websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;

  useEffect(() => {
    const tableTimer = setTimeout(() => setLoadingAdminTable(false), 1300);
    return () => clearTimeout(tableTimer);
  }, [setLoadingAdminTable]);

  useEffect(() => {
    if (websocketUrl) return;

    const interval = setInterval(() => {
      const currentBuses = useBusMateStore.getState().buses;
      currentBuses.forEach((bus) => {
        const nextX = clamp(bus.position.x + (Math.random() * 8 - 4), 5, 95);
        const nextY = clamp(bus.position.y + (Math.random() * 8 - 4), 8, 92);
        const nextEta = Math.max(2, bus.eta + Math.floor(Math.random() * 3) - 1);
        updateBusFromFeed(bus.id, {
          eta: nextEta,
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
  }, [websocketUrl, updateBusFromFeed]);

  useEffect(() => {
    if (!websocketUrl) return;

    const socket = new WebSocket(websocketUrl);
    socket.addEventListener("open", () =>
      pushNotification("WebSocket connected. Live bus tracking started.", "success"),
    );
    socket.addEventListener("message", (event) => {
      try {
        const parsed: unknown = JSON.parse(event.data);
        const incomingItems = Array.isArray(parsed) ? parsed : [parsed];
        incomingItems.forEach((raw) => {
          if (!raw || typeof raw !== "object") return;
          const item = raw as Record<string, unknown>;
          const busId = item.id ?? item.busId;
          if (busId === undefined || busId === null) return;
          const normalized = normalizeFeedItem(item);
          updateBusFromFeed(String(busId), normalized);
        });
      } catch {
        pushNotification("Received malformed live tracking payload.", "error");
      }
    });
    socket.addEventListener("close", () =>
      pushNotification("WebSocket disconnected. Reverting to local simulation.", "warning"),
    );
    socket.addEventListener("error", () => pushNotification("WebSocket connection error.", "error"));
    return () => socket.close();
  }, [websocketUrl, pushNotification, updateBusFromFeed]);
};
