import mongoose from "mongoose";
import { env } from "./env";

const MONGODB_URI = env.mongodbUri;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

function getMongooseCache(): MongooseCache {
  if (!globalForMongoose.mongooseCache) {
    globalForMongoose.mongooseCache = { conn: null, promise: null };
  }
  return globalForMongoose.mongooseCache;
}

async function dbConnect() {
  const cached = getMongooseCache();

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    const { connection } = cached.conn;
    console.log("[MongoDB] Connected", {
      database: connection.name,
      host: connection.host,
      readyState: connection.readyState, // 1 = connected
    });
  } catch (e) {
    cached.promise = null;
    console.error(
      "[MongoDB] Connection failed:",
      e instanceof Error ? e.message : e,
    );
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
