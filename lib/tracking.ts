import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// 1×1 transparent GIF
export const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function injectTracking(
  htmlBody: string,
  openToken: string,
  clickTokenMap: Map<string, string>, // original url -> token
  appUrl: string
): string {
  let result = htmlBody;

  for (const [originalUrl, token] of clickTokenMap) {
    const trackUrl = `${appUrl}/api/track/click/${token}?url=${encodeURIComponent(originalUrl)}`;
    // Replace existing href="originalUrl" anchors
    result = result.replaceAll(`href="${originalUrl}"`, `href="${trackUrl}"`);
    // Replace any remaining raw URL text (not inside an href) with a tracked anchor
    result = result.replace(
      new RegExp(`(?<!href=["'])${escapeRegex(originalUrl)}`, "g"),
      `<a href="${trackUrl}">${originalUrl}</a>`
    );
  }

  // Append open pixel
  const pixel = `<img src="${appUrl}/api/track/open/${openToken}" width="1" height="1" style="display:none" alt="" />`;
  result = result + pixel;

  return result;
}

export function extractLinks(body: string): string[] {
  const links: string[] = [];
  // Match href="..." in HTML
  const hrefRegex = /href="(https?:\/\/[^"]+)"/g;
  // Match raw URLs in plain text
  const rawRegex = /(?<![="'])(https?:\/\/[^\s<>"']+)/g;
  let match;
  while ((match = hrefRegex.exec(body)) !== null) links.push(match[1]);
  while ((match = rawRegex.exec(body)) !== null) links.push(match[1]);
  return [...new Set(links)];
}
