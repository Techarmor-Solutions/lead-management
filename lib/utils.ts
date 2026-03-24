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

export function buildEmailHtml(
  bodyHtml: string,
  ctaText?: string | null,
  ctaUrl?: string | null,
  unsubscribeUrl?: string,
  signature?: string
): string {
  let html = bodyHtml;

  if (ctaText && ctaUrl) {
    html += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr>
    <td>
      <a href="${ctaUrl}" style="background-color:#eb9447;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;font-size:14px;">${ctaText}</a>
    </td>
  </tr>
</table>`;
  }

  if (signature) {
    html += `
<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:13px;color:#374151;">
  ${signature}
</div>`;
  }

  if (unsubscribeUrl) {
    html += `
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">
  <p style="margin:0;">Don't want to receive these emails? <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
</div>`;
  }

  return html;
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

export function matchCategory(industry: string, categories: string[]): string {
  if (!industry || categories.length === 0) return industry;
  const normalized = industry.toLowerCase().trim();
  const exact = categories.find((c) => c.toLowerCase().trim() === normalized);
  if (exact) return exact;
  const sub = categories.find((c) => {
    const cn = c.toLowerCase().trim();
    return cn.includes(normalized) || normalized.includes(cn);
  });
  return sub || industry;
}
