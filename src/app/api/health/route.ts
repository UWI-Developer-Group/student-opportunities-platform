import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";


export async function GET() {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("No database handle after connecting");

    await db.command({ ping: 1 });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    // Details go to the server log, not the response.
    console.error("Health check failed:", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}