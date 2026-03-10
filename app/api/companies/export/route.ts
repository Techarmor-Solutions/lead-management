import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const industry = req.nextUrl.searchParams.get("industry") || "";

  const companies = await prisma.company.findMany({
    where: industry ? { industry: { equals: industry, mode: "insensitive" } } : {},
    orderBy: { createdAt: "desc" },
  });

  const headers = ["Name", "Address", "City", "State", "Zip", "Phone", "Website", "Industry", "Employee Count", "Rating", "Source", "Created"];
  const rows = companies.map((c) => [
    c.name,
    c.address,
    c.city,
    c.state,
    c.zip,
    c.phone,
    c.website,
    c.industry,
    c.employeeCount,
    c.rating,
    c.source,
    new Date(c.createdAt).toISOString().split("T")[0],
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="companies-${Date.now()}.csv"`,
    },
  });
}
