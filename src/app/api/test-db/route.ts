import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const heroCount = await prisma.hero.count();
    const serviceCount = await prisma.service.count();

    return NextResponse.json({
      status: "connected",
      database: process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] || "unknown",
      counts: {
        hero: heroCount,
        services: serviceCount,
      },
    });
  } catch (error) {
    const err = error as { message?: string; code?: string };
    return NextResponse.json(
      {
        status: "error",
        message: err.message || "Unknown error",
        code: err.code || "unknown",
        database: process.env.DATABASE_URL ? "configured" : "not configured",
      },
      { status: 500 }
    );
  }
}

