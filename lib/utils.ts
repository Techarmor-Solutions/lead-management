import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function applyPersonalizationTags(
  text: string,
  contact: { firstName: string; lastName: string; email: string },
  company: { name: string },
  senderName?: string
): string {
  return text
    .replace(/\{\{first_name\}\}/g, contact.firstName || "there")
    .replace(/\{\{last_name\}\}/g, contact.lastName || "")
    .replace(/\{\{full_name\}\}/g, `${contact.firstName} ${contact.lastName}`.trim() || "there")
    .replace(/\{\{company_name\}\}/g, company.name || "your company")
    .replace(/\{\{email\}\}/g, contact.email || "")
    .replace(/\{\{sender_name\}\}/g, senderName || "Caleb");
}

export function buildEmailHtml(bodyHtml: string, ctaText?: string | null, ctaUrl?: string | null): string {
  if (!ctaText || !ctaUrl) return bodyHtml;

  const button = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr>
    <td>
      <a href="${ctaUrl}" style="background-color:#eb9447;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;font-size:14px;">${ctaText}</a>
    </td>
  </tr>
</table>`;

  return bodyHtml + button;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function pct(numerator: number, denominator: number): string {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}
