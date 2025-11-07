import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Try to count records
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
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
        code: error.code,
        database: process.env.DATABASE_URL ? "configured" : "not configured",
      },
      { status: 500 }
    );
  }
}

