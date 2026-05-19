import { getRedis } from "@/lib/redis";

const TTL_SEC = 60;
const key = (busId: string) => `busmate:driver_loc:${busId}`;

export type CachedDriverLocation = {
  lat: number;
  lng: number;
  updatedAt: number;
};

export async function cacheDriverLocation(
  busId: string,
  payload: CachedDriverLocation,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.setex(key(busId), TTL_SEC, JSON.stringify(payload));
  } catch (e) {
    console.error("Redis SET driver location:", e);
  }
}

export async function getCachedDriverLocation(
  busId: string,
): Promise<CachedDriverLocation | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(key(busId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedDriverLocation;
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch (e) {
    console.error("Redis GET driver location:", e);
    return null;
  }
}

export async function deleteCachedDriverLocation(busId: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key(busId));
  } catch (e) {
    console.error("Redis DEL driver location:", e);
  }
}


export function isDriverLocationCacheFresh(
  cached: CachedDriverLocation | null | undefined,
  maxAgeMs = TTL_SEC * 1000,
): boolean {
  if (!cached) return false;
  return Date.now() - cached.updatedAt < maxAgeMs;
}

export async function getCachedDriverLocations(
  busIds: string[],
): Promise<Map<string, CachedDriverLocation>> {
  const out = new Map<string, CachedDriverLocation>();
  const r = getRedis();
  if (!r || busIds.length === 0) return out;
  try {
    const keys = busIds.map((id) => key(id));
    const values = await r.mget(...keys);
    for (let i = 0; i < busIds.length; i++) {
      const raw = values[i];
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as CachedDriverLocation;
        if (
          typeof parsed.lat === "number" &&
          typeof parsed.lng === "number" &&
          typeof parsed.updatedAt === "number"
        ) {
          out.set(busIds[i], parsed);
        }
      } catch {
        
      }
    }
  } catch (e) {
    console.error("Redis MGET driver locations:", e);
  }
  return out;
}
