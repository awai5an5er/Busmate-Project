import Redis from "ioredis";

type RedisGlobal = typeof globalThis & { __busmateRedis?: Redis };



export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  const g = globalThis as RedisGlobal;
  if (!g.__busmateRedis) {
    g.__busmateRedis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return g.__busmateRedis;
}
