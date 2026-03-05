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
