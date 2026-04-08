import { NextResponse } from "next/server";

// Demo bypass: return a static demo user ID
export async function GET() {
  return NextResponse.json({ id: "demo-admin" });
}
