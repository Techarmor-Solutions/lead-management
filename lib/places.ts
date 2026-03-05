export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  rating: number | null;
  totalRatings: number | null;
  types: string[];
}

export interface PlacesSearchParams {
  query: string;
  location?: string;
  radius?: number; // meters, default 50000
  minRating?: number;
  pageToken?: string;
}

export async function searchPlaces(
  params: PlacesSearchParams
): Promise<{ results: PlaceSearchResult[]; nextPageToken?: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY not set");

  const textQuery = params.location
    ? `${params.query} in ${params.location}`
    : params.query;

  const body: Record<string, unknown> = {
    textQuery,
    maxResultCount: 20,
    languageCode: "en",
    regionCode: "US",
  };

  if (params.pageToken) {
    body.pageToken = params.pageToken;
  }

  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,nextPageToken",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Places API error: ${err}`);
  }

  const data = await res.json();

  const results: PlaceSearchResult[] = (data.places || []).map(
    (place: Record<string, unknown>) => {
      const addressComponents =
        (place.addressComponents as { shortText: string; types: string[] }[]) ||
        [];
      const city =
        addressComponents.find((c) => c.types.includes("locality"))
          ?.shortText || "";
      const state =
        addressComponents.find((c) =>
          c.types.includes("administrative_area_level_1")
        )?.shortText || "";
      const zip =
        addressComponents.find((c) => c.types.includes("postal_code"))
          ?.shortText || "";

      return {
        placeId: place.id as string,
        name: (place.displayName as { text: string })?.text || "",
        address: (place.formattedAddress as string) || "",
        city,
        state,
        zip,
        phone: (place.internationalPhoneNumber as string) || "",
        website: (place.websiteUri as string) || "",
        rating: (place.rating as number) ?? null,
        totalRatings: (place.userRatingCount as number) ?? null,
        types: (place.types as string[]) || [],
      };
    }
  );

  return {
    results,
    nextPageToken: data.nextPageToken,
  };
}
