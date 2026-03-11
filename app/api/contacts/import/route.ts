import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/csv";

async function findOrCreateCompany(name: string): Promise<string> {
  const existing = await prisma.company.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing.id;

  const created = await prisma.company.create({
    data: { name, source: "csv_import" },
  });
  return created.id;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) return NextResponse.json({ error: "No data rows found" }, { status: 400 });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const firstName = row["first name"] || row["firstname"] || "";
    const lastName  = row["last name"]  || row["lastname"]  || "";
    const email     = row["email"]      || row["email address"] || "";
    const companyName = row["company name"] || row["company"] || "";

    if (!firstName && !lastName && !email) { skipped++; continue; }

    try {
      const companyId = companyName
        ? await findOrCreateCompany(companyName)
        : await findOrCreateCompany("Unknown");

      // Skip duplicate: same email at same company
      if (email) {
        const dup = await prisma.contact.findFirst({ where: { companyId, email } });
        if (dup) { skipped++; continue; }
      }

      await prisma.contact.create({
        data: {
          firstName,
          lastName,
          title:    row["title"] || row["job title"] || "",
          email,
          phone:    row["phone"] || "",
          linkedin: row["linkedin"] || row["linkedin url"] || "",
          notes:    row["notes"] || "",
          companyId,
        },
      });
      created++;
    } catch (e) {
      const label = [firstName, lastName, email].filter(Boolean).join(" ");
      errors.push(`Row "${label}": ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ created, skipped, errors });
}
