import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findEmail, verifyEmail } from "@/lib/hunter";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { company: true },
  });

  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!contact.firstName || !contact.lastName) {
    return NextResponse.json({ error: "Contact needs first and last name" }, { status: 400 });
  }
  if (!contact.company.website) {
    return NextResponse.json({ error: "Company has no website" }, { status: 400 });
  }

  let domain: string;
  try {
    domain = new URL(contact.company.website).hostname.replace(/^www\./, "");
  } catch {
    return NextResponse.json({ error: "Invalid company website URL" }, { status: 400 });
  }

  const found = await findEmail(contact.firstName, contact.lastName, domain);
  if (!found) return NextResponse.json({ email: null, status: "not_found" });

  // Run verifier for extra confidence
  const verified = await verifyEmail(found.email);
  const finalStatus = verified?.result ?? found.status;
  const finalScore = verified?.score ?? found.score;

  await prisma.contact.update({
    where: { id },
    data: {
      email: found.email,
      enrichmentSummary: "Hunter-verified",
    },
  });

  return NextResponse.json({ email: found.email, status: finalStatus, score: finalScore });
}
