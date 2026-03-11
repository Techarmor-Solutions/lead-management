import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/csv";

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
    const name = row["name"] || row["company name"] || row["company"];
    if (!name) { skipped++; continue; }

    try {
      const existing = await prisma.company.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });
      if (existing) { skipped++; continue; }

      await prisma.company.create({
        data: {
          name,
          address:       row["address"]        || "",
          city:          row["city"]            || "",
          state:         row["state"]           || "",
          zip:           row["zip"] || row["postal code"] || "",
          phone:         row["phone"]           || "",
          website:       row["website"]         || "",
          industry:      row["industry"]        || "",
          employeeCount: row["employee count"] || row["employees"] || "",
          notes:         row["notes"]           || "",
          source:        "csv_import",
        },
      });
      created++;
    } catch (e) {
      errors.push(`Row "${name}": ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ created, skipped, errors });
}
