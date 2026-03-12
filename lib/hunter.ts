const HUNTER_API_BASE = "https://api.hunter.io/v2";
const API_KEY = process.env.HUNTER_API_KEY;

export interface HunterEmailResult {
  email: string;
  score: number;
  status: "deliverable" | "risky" | "undeliverable";
}

export interface HunterDomainResult {
  pattern: string;
  emails: {
    email: string;
    firstName: string;
    lastName: string;
    position: string;
    confidence: number;
  }[];
}

export interface HunterVerifyResult {
  result: "deliverable" | "risky" | "undeliverable";
  score: number;
}

function isUsable(result: "deliverable" | "risky" | "undeliverable", score: number) {
  return result === "deliverable" || (result === "risky" && score >= 80);
}

export async function findEmail(
  firstName: string,
  lastName: string,
  domain: string
): Promise<HunterEmailResult | null> {
  if (!API_KEY) return null;

  const url = new URL(`${HUNTER_API_BASE}/email-finder`);
  url.searchParams.set("first_name", firstName);
  url.searchParams.set("last_name", lastName);
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const json = await res.json();
  const data = json?.data;
  if (!data?.email) return null;

  const result: HunterEmailResult = {
    email: data.email,
    score: data.score ?? 0,
    status: data.result ?? "undeliverable",
  };

  if (!isUsable(result.status, result.score)) return null;
  return result;
}

export async function searchDomain(domain: string): Promise<HunterDomainResult | null> {
  if (!API_KEY) return null;

  const url = new URL(`${HUNTER_API_BASE}/domain-search`);
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const json = await res.json();
  const data = json?.data;
  if (!data) return null;

  return {
    pattern: data.pattern ?? "",
    emails: (data.emails ?? []).map((e: Record<string, unknown>) => ({
      email: e.value,
      firstName: e.first_name ?? "",
      lastName: e.last_name ?? "",
      position: e.position ?? "",
      confidence: e.confidence ?? 0,
    })),
  };
}

export async function verifyEmail(email: string): Promise<HunterVerifyResult | null> {
  if (!API_KEY) return null;

  const url = new URL(`${HUNTER_API_BASE}/email-verifier`);
  url.searchParams.set("email", email);
  url.searchParams.set("api_key", API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const json = await res.json();
  const data = json?.data;
  if (!data) return null;

  return {
    result: data.result ?? "undeliverable",
    score: data.score ?? 0,
  };
}

export { isUsable };
