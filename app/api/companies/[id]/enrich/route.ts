import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enrichCompany } from "@/lib/claude";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const enrichmentData = await enrichCompany(company.name, company.website, company.industry);

  // Update company with enrichment
  const updated = await prisma.company.update({
    where: { id },
    data: {
      enrichmentData: enrichmentData as never,
      enrichedAt: new Date(),
    },
  });

  // Create/update contacts from enrichment
  for (const contact of enrichmentData.contacts) {
    if (!contact.firstName && !contact.lastName) continue;

    await prisma.contact.upsert({
      where: {
        // Use a composite unique approach — try to find by email+company
        id: (
          await prisma.contact.findFirst({
            where: { companyId: id, email: contact.email || "__" },
            select: { id: true },
          })
        )?.id || "__new__",
      },
      update: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        title: contact.title,
        email: contact.email,
        phone: contact.phone,
        linkedin: contact.linkedin,
        enrichedAt: new Date(),
      },
      create: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        title: contact.title,
        email: contact.email || "",
        phone: contact.phone || "",
        linkedin: contact.linkedin || "",
        companyId: id,
        enrichedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ company: updated, enrichmentData });
}
