import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("listId");
  const skipNoPhone = searchParams.get("skipNoPhone") !== "false";
  const skipCalledToday = searchParams.get("skipCalledToday") !== "false";

  if (!listId) return NextResponse.json({ error: "listId required" }, { status: 400 });

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  const members = await prisma.contactListMember.findMany({
    where: { listId },
    include: {
      contact: {
        include: {
          company: { select: { id: true, name: true } },
          activities: {
            where: { type: "CALL" },
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let contacts = members.map((m) => {
    const c = m.contact;
    const lastCall = c.activities[0] ?? null;
    const calledToday = lastCall
      ? lastCall.date >= todayStart && lastCall.date < tomorrowStart
      : false;
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      title: c.title,
      phone: c.phone,
      status: c.status,
      notes: c.notes,
      company: c.company,
      lastCall: lastCall
        ? { outcome: lastCall.outcome, date: lastCall.date.toISOString() }
        : null,
      calledToday,
    };
  });

  if (skipNoPhone) contacts = contacts.filter((c) => c.phone?.trim());
  if (skipCalledToday) contacts = contacts.filter((c) => !c.calledToday);

  return NextResponse.json(contacts.map(({ calledToday: _, ...rest }) => rest));
}
