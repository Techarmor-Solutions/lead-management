import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TRACKING_PIXEL } from "@/lib/tracking";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const trackingToken = await prisma.trackingToken.findUnique({
      where: { token },
      include: { send: true },
    });

    if (trackingToken && !trackingToken.usedAt) {
      await prisma.trackingToken.update({
        where: { token },
        data: { usedAt: new Date() },
      });

      // Update send record
      if (!trackingToken.send.openedAt) {
        await prisma.send.update({
          where: { id: trackingToken.sendId },
          data: { openedAt: new Date(), status: "OPENED" },
        });
      }
    }
  } catch {
    // Silent fail — always return the pixel
  }

  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
