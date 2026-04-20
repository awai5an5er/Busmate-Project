"use client";

import axios from "axios";
import { useFcmNotifications } from "@/hooks/useFcmNotifications";
import { useRealtimeBusFeed } from "@/hooks/useRealtimeBusFeed";
import { getClientAuthToken } from "@/lib/clientAuthToken";

let axiosAuthAttached = false;

function ensureAxiosAuthInterceptor() {
  if (axiosAuthAttached || typeof window === "undefined") return;
  axiosAuthAttached = true;
  axios.interceptors.request.use((config) => {
    const t = getClientAuthToken();
    if (t) {
      config.headers.Authorization = `Bearer ${t}`;
    }
    return config;
  });
}

export function ClientBoot() {
  ensureAxiosAuthInterceptor();
  useRealtimeBusFeed();
  useFcmNotifications();
  return null;
}
