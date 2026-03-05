import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = req.nextUrl.searchParams.get("url") || "/";

  try {
    const trackingToken = await prisma.trackingToken.findUnique({
      where: { token },
      include: { send: true },
    });

    if (trackingToken) {
      await prisma.trackingToken.update({
        where: { token },
        data: { usedAt: new Date() },
      });

      if (!trackingToken.send.clickedAt) {
        await prisma.send.update({
          where: { id: trackingToken.sendId },
          data: { clickedAt: new Date(), status: "CLICKED" },
        });
      }
    }
  } catch {
    // Silent fail
  }

  return NextResponse.redirect(url);
}
