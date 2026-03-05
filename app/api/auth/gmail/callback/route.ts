import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuthClient } from "@/lib/gmail";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=gmail_no_code", req.url));
  }

  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Get the user's email
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  // Store/update credentials
  const existing = await prisma.gmailCredential.findFirst();
  if (existing) {
    await prisma.gmailCredential.update({
      where: { id: existing.id },
      data: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || existing.refreshToken,
        expiryDate: BigInt(tokens.expiry_date || 0),
        email: data.email || existing.email,
      },
    });
  } else {
    await prisma.gmailCredential.create({
      data: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiryDate: BigInt(tokens.expiry_date || 0),
        email: data.email || "",
      },
    });
  }

  return NextResponse.redirect(new URL("/settings?gmail=connected", req.url));
}
