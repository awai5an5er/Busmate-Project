import mongoose from "mongoose";

/** Resolve a bus by MongoDB `_id` or by `shortId` (e.g. bus-101). */
export function busFilter(busId: string) {
  if (/^[a-f0-9]{24}$/i.test(busId)) {
    return { _id: new mongoose.Types.ObjectId(busId) };
  }
  return { shortId: busId };
}
