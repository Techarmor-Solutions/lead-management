import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// 1×1 transparent GIF
export const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export function injectTracking(
  htmlBody: string,
  openToken: string,
  clickTokenMap: Map<string, string>, // original url -> token
  appUrl: string
): string {
  let result = htmlBody;

  // Wrap links
  for (const [originalUrl, token] of clickTokenMap) {
    const trackUrl = `${appUrl}/api/track/click/${token}?url=${encodeURIComponent(originalUrl)}`;
    result = result.replaceAll(originalUrl, trackUrl);
  }

  // Append open pixel
  const pixel = `<img src="${appUrl}/api/track/open/${openToken}" width="1" height="1" style="display:none" alt="" />`;
  result = result + pixel;

  return result;
}

export function extractLinks(htmlBody: string): string[] {
  const linkRegex = /href="(https?:\/\/[^"]+)"/g;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(htmlBody)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}
