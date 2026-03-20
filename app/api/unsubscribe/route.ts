import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get("cid");

  if (!cid) {
    return new NextResponse(errorHtml("Invalid unsubscribe link."), { headers: { "Content-Type": "text/html" } });
  }

  const contact = await prisma.contact.findUnique({ where: { id: cid } });

  if (!contact) {
    return new NextResponse(errorHtml("Contact not found."), { headers: { "Content-Type": "text/html" } });
  }

  // Mark as DNC
  await prisma.contact.update({
    where: { id: cid },
    data: { status: "DO_NOT_CONTACT" },
  });

  // Cancel all pending/scheduled sends
  await prisma.send.updateMany({
    where: { contactId: cid, status: { in: ["PENDING", "SCHEDULED"] } },
    data: { status: "CANCELLED" },
  });

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "there";

  return new NextResponse(successHtml(name), { headers: { "Content-Type": "text/html" } });
}

function successHtml(name: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:Arial,sans-serif;background:#f9f9f9;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
.box{background:#fff;border-radius:8px;padding:40px;max-width:480px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08);}
h1{color:#111;font-size:22px;margin:0 0 12px;}p{color:#555;margin:0;line-height:1.6;}</style>
</head>
<body><div class="box">
<h1>You've been unsubscribed</h1>
<p>Hi ${name}, you've been removed from this mailing list and won't receive any more emails from us.</p>
</div></body></html>`;
}

function errorHtml(msg: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Error</title>
<style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
.box{text-align:center;padding:40px;}</style>
</head>
<body><div class="box"><h1>Something went wrong</h1><p>${msg}</p></div></body></html>`;
}
