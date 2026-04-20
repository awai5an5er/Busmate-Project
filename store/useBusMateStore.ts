"use client";

import { create } from "zustand";
import { initialBuses } from "@/data/mockData";
import type { Bus, BusNotification, NotificationType } from "@/types/busmate";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type BusMateState = {
  buses: Bus[];
  notifications: BusNotification[];
  driverTripActive: boolean;
  gpsActive: boolean;
  loadingAdminTable: boolean;
  setLoadingAdminTable: (value: boolean) => void;
  startTrip: () => void;
  endTrip: () => void;
  setGpsActive: (value: boolean) => void;
  /** Insert or replace a bus by `id` (used when hydrating driver assignment from the API). */
  upsertBus: (bus: Bus) => void;
  updateSeatAvailability: (busId: string, seats: number) => void;
  updateBusFromFeed: (busId: string, payload: Partial<Bus>) => void;
  pushNotification: (message: string, type?: NotificationType) => void;
  /** Merge server-persisted broadcasts without duplicating ids (student portal polling). */
  mergeBroadcastNotifications: (
    items: Array<{ id: string; message: string; type: NotificationType; createdAt: number }>,
  ) => void;
  dismissNotification: (id: string) => void;
};

export const useBusMateStore = create<BusMateState>((set) => ({
  buses: initialBuses,
  notifications: [],
  driverTripActive: false,
  gpsActive: true,
  loadingAdminTable: true,
  setLoadingAdminTable: (value) => set({ loadingAdminTable: value }),
  startTrip: () => set({ driverTripActive: true }),
  endTrip: () => set({ driverTripActive: false }),
  setGpsActive: (value) => set({ gpsActive: value }),
  upsertBus: (bus) =>
    set((state) => {
      const idx = state.buses.findIndex((b) => b.id === bus.id);
      if (idx === -1) {
        return { buses: [...state.buses, bus] };
      }
      const next = [...state.buses];
      next[idx] = { ...next[idx], ...bus };
      return { buses: next };
    }),
  updateSeatAvailability: (busId, seats) =>
    set((state) => ({
      buses: state.buses.map((bus) => {
        if (bus.id !== busId) return bus;
        const cap = bus.totalSeats ?? 40;
        return { ...bus, seatsAvailable: clamp(seats, 0, cap) };
      }),
    })),
  updateBusFromFeed: (busId, payload) =>
    set((state) => ({
      buses: state.buses.map((bus) => {
        if (bus.id !== busId) return bus;
        const merged = { ...bus, ...payload };
        if (payload.position) {
          merged.position = { ...bus.position, ...payload.position };
        }
        return merged;
      }),
    })),
  pushNotification: (message, type = "info") =>
    set((state) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as { randomUUID: () => string }).randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

      return {
        notifications: [
          { id, message, type, createdAt: Date.now() },
          ...state.notifications,
        ].slice(0, 15),
      };
    }),
  mergeBroadcastNotifications: (items) =>
    set((state) => {
      if (items.length === 0) return state;
      const existing = new Set(state.notifications.map((n) => n.id));
      const incoming = items.filter((i) => !existing.has(i.id));
      if (incoming.length === 0) return state;
      const next = [
        ...incoming.map((i) => ({
          id: i.id,
          message: i.message,
          type: i.type,
          createdAt: i.createdAt,
        })),
        ...state.notifications,
      ]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 15);
      return { notifications: next };
    }),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((item) => item.id !== id),
    })),
}));
