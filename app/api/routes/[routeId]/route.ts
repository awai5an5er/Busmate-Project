import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Bus as BusModel, Route as RouteModel } from "@/models";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ routeId: string }> },
) {
  try {
    await dbConnect();
    const { routeId } = await context.params;

    if (!routeId) {
      return NextResponse.json({ error: "Missing route id." }, { status: 400 });
    }

    // Delete the Route
    const deletedRoute = await RouteModel.findByIdAndDelete(routeId);
    
    if (!deletedRoute) {
      return NextResponse.json({ error: "Route not found." }, { status: 404 });
    }

    // Delete the associated Bus to free up the route slot
    await BusModel.findOneAndDelete({ routeId: routeId });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/routes/[routeId] error:", error);
    return NextResponse.json(
      { error: "Unable to delete route." },
      { status: 500 },
    );
  }
}
