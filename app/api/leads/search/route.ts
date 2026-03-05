import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/places";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const query = params.get("query");
  const location = params.get("location") || undefined;
  const minRating = params.get("minRating");
  const pageToken = params.get("pageToken") || undefined;

  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const data = await searchPlaces({
    query,
    location,
    pageToken,
  });

  // Filter by min rating if requested
  if (minRating) {
    data.results = data.results.filter(
      (r) => !r.rating || r.rating >= parseFloat(minRating)
    );
  }

  return NextResponse.json(data);
}
