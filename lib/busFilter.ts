import mongoose from "mongoose";


export function busFilter(busId: string) {
  if (/^[a-f0-9]{24}$/i.test(busId)) {
    return { _id: new mongoose.Types.ObjectId(busId) };
  }
  return { shortId: busId };
}
