import mongoose from "mongoose";
import { Bus as BusModel, User } from "@/models";

/** Clear active boarding on all students who boarded this bus (trip end / new trip). */
export async function clearStudentBoardingForBus(
  busMongoId: mongoose.Types.ObjectId | string,
) {
  const busId =
    typeof busMongoId === "string"
      ? new mongoose.Types.ObjectId(busMongoId)
      : busMongoId;

  await User.updateMany(
    { boardedBusId: busId },
    {
      $unset: {
        boardedRouteId: 1,
        boardedBusName: 1,
        boardedBusId: 1,
      },
    },
  );
}

/** Remove orphan bus list entries when the user has no active boarding record. */
export async function pullStaleBusBookings(
  studentId: mongoose.Types.ObjectId,
) {
  await BusModel.updateMany(
    { bookedStudentIds: studentId },
    { $pull: { bookedStudentIds: studentId } },
  );
}
