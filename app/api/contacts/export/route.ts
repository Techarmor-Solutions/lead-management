import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") || "";

  const contacts = await prisma.contact.findMany({
    where: status ? { status: status as never } : {},
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const headers = ["First Name", "Last Name", "Title", "Email", "Phone", "LinkedIn", "Company", "Status", "Created"];
  const rows = contacts.map((c) => [
    c.firstName,
    c.lastName,
    c.title,
    c.email,
    c.phone,
    c.linkedin,
    c.company.name,
    c.status,
    new Date(c.createdAt).toISOString().split("T")[0],
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="contacts-${Date.now()}.csv"`,
    },
  });
}
