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

const GENERIC_PREFIXES = new Set([
  "info", "contact", "hello", "support", "admin", "sales", "team",
  "help", "noreply", "no-reply", "mail", "office", "enquiries",
]);

export interface DomainSearchContact {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
}

export async function domainSearch(domain: string): Promise<DomainSearchContact[]> {
  if (!API_KEY) return [];

  const url = new URL(`${HUNTER_API_BASE}/domain-search`);
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("type", "personal");

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const json = await res.json();
  const emails: Record<string, unknown>[] = json?.data?.emails ?? [];

  return emails
    .filter((e) => {
      const confidence = (e.confidence as number) ?? 0;
      if (confidence < 70) return false;
      const prefix = ((e.value as string) ?? "").split("@")[0].toLowerCase();
      if (GENERIC_PREFIXES.has(prefix)) return false;
      if (!e.first_name && !e.last_name) return false;
      return true;
    })
    .map((e) => ({
      firstName: (e.first_name as string) ?? "",
      lastName: (e.last_name as string) ?? "",
      email: (e.value as string) ?? "",
      title: (e.position as string) ?? "",
    }));
}

export { isUsable };
