import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enrichCompany } from "@/lib/claude";
import { findEmail } from "@/lib/hunter";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const enrichmentData = await enrichCompany(company.name, company.website, company.industry, company.city, company.state);

  const updated = await prisma.company.update({
    where: { id },
    data: {
      enrichmentData: enrichmentData as never,
      enrichedAt: new Date(),
    },
  });

  // Save contacts — find existing by email+company or create new
  for (const contact of enrichmentData.contacts) {
    if (!contact.firstName && !contact.lastName) continue;

    const contactData = {
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      linkedin: contact.linkedin || "",
      enrichedAt: new Date(),
    };

    const existing = contact.email
      ? await prisma.contact.findFirst({ where: { companyId: id, email: contact.email } })
      : await prisma.contact.findFirst({
          where: { companyId: id, firstName: contact.firstName, lastName: contact.lastName },
        });

    // If no email yet, try Hunter.io
    if (!contactData.email && contact.firstName && contact.lastName && company.website) {
      try {
        const domain = new URL(company.website).hostname.replace(/^www\./, "");
        const found = await findEmail(contact.firstName, contact.lastName, domain);
        if (found) {
          contactData.email = found.email;
          (contactData as Record<string, unknown>).enrichmentSummary = "Hunter-verified";
        }
      } catch {
        // ignore URL parse errors or API failures
      }
    }

    if (existing) {
      await prisma.contact.update({ where: { id: existing.id }, data: contactData });
    } else {
      await prisma.contact.create({ data: { ...contactData, companyId: id } });
    }
  }

  return NextResponse.json({ company: updated, enrichmentData });
}
