import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { domainSearch } from "@/lib/hunter";
import { enrichCompanyLite } from "@/lib/claude";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function extractDomain(website: string): string | null {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function saveContacts(
  companyId: string,
  contacts: { firstName: string; lastName: string; title: string; email: string; phone: string; linkedin: string }[]
) {
  for (const contact of contacts) {
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
      ? await prisma.contact.findFirst({ where: { companyId, email: contact.email } })
      : await prisma.contact.findFirst({
          where: { companyId, firstName: contact.firstName, lastName: contact.lastName },
        });

    if (existing) {
      await prisma.contact.update({ where: { id: existing.id }, data: contactData });
    } else {
      await prisma.contact.create({ data: { ...contactData, companyId } });
    }
  }

  // Auto-sync all contacts into any lists this company belongs to
  const listMemberships = await prisma.companyListMember.findMany({
    where: { companyId },
    select: { listId: true },
  });
  if (listMemberships.length > 0) {
    const allContacts = await prisma.contact.findMany({
      where: { companyId },
      select: { id: true },
    });
    for (const { listId } of listMemberships) {
      await prisma.contactListMember.createMany({
        data: allContacts.map((c) => ({ listId, contactId: c.id })),
        skipDuplicates: true,
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const { companyIds } = await req.json();

  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return NextResponse.json({ error: "companyIds required" }, { status: 400 });
  }

  const results = {
    processed: 0,
    hunterHits: 0,
    aiHits: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const id of companyIds) {
    try {
      const company = await prisma.company.findUnique({ where: { id } });
      if (!company) { results.errors.push(`${id}: not found`); continue; }

      // Skip if enriched within last 30 days
      if (company.enrichedAt && Date.now() - company.enrichedAt.getTime() < THIRTY_DAYS_MS) {
        results.skipped++;
        continue;
      }

      results.processed++;
      let enriched = false;

      // Pipeline A: Hunter domain search
      if (company.website) {
        const domain = extractDomain(company.website);
        if (domain) {
          const hunterContacts = await domainSearch(domain);
          if (hunterContacts.length > 0) {
            await saveContacts(
              id,
              hunterContacts.map((c) => ({ ...c, phone: "", linkedin: "" }))
            );
            await prisma.company.update({ where: { id }, data: { enrichedAt: new Date() } });
            results.hunterHits++;
            enriched = true;
          }
        }
      }

      // Pipeline B: Haiku fallback
      if (!enriched) {
        const enrichmentData = await enrichCompanyLite(
          company.name,
          company.website,
          company.industry,
          company.city,
          company.state
        );
        if (enrichmentData.contacts.length > 0) {
          await saveContacts(id, enrichmentData.contacts);
          results.aiHits++;
        }
        await prisma.company.update({
          where: { id },
          data: { enrichedAt: new Date(), enrichmentData: enrichmentData as never },
        });
      }

      // Rate limit buffer
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      results.errors.push(`${id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return NextResponse.json(results);
}
