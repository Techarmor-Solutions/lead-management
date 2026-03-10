import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import CompanyEnrichButton from "./CompanyEnrichButton";
import ContactCard from "./ContactCard";
import AddContactButton from "./AddContactButton";
import Link from "next/link";
import { Globe, Phone, MapPin, Star, ArrowLeft, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: { contacts: { orderBy: { createdAt: "desc" } } },
  });

  if (!company) notFound();

  const enrichment = company.enrichmentData as Record<string, unknown> | null;

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/companies" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Companies
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{company.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-zinc-500">
            {(company.city || company.state) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {[company.city, company.state].filter(Boolean).join(", ")}
              </span>
            )}
            {company.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {company.phone}
              </span>
            )}
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                <Globe className="w-4 h-4" />
                {company.website.replace(/^https?:\/\//, "").split("/")[0]}
              </a>
            )}
            {company.rating && (
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4" />
                {company.rating} ({company.totalRatings} reviews)
              </span>
            )}
          </div>
        </div>
        <CompanyEnrichButton companyId={id} enrichedAt={company.enrichedAt?.toISOString() || null} />
      </div>

      {/* Enrichment Summary */}
      {enrichment && (
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 mb-6">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">AI Enrichment</div>
          {!!enrichment.companySummary && (
            <p className="text-sm text-zinc-300 mb-3">{String(enrichment.companySummary)}</p>
          )}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {!!enrichment.companyLinkedIn && (
              <div>
                <span className="text-zinc-500">LinkedIn: </span>
                <a href={String(enrichment.companyLinkedIn)} target="_blank" rel="noopener noreferrer" className="text-blue-400">
                  View Profile
                </a>
              </div>
            )}
            {!!enrichment.techStack && (
              <div>
                <span className="text-zinc-500">Tech: </span>
                <span className="text-zinc-300">{String(enrichment.techStack)}</span>
              </div>
            )}
            {!!enrichment.recentNews && (
              <div className="col-span-2">
                <span className="text-zinc-500">News: </span>
                <span className="text-zinc-300">{String(enrichment.recentNews)}</span>
              </div>
            )}
          </div>
          <div className="text-xs text-zinc-600 mt-3">Enriched {formatDate(company.enrichedAt)}</div>
        </div>
      )}

      {/* Contacts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Contacts ({company.contacts.length})</h2>
          <AddContactButton companyId={id} />
        </div>
        {company.contacts.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl py-10 text-center text-zinc-500">
            <Building2 className="w-6 h-6 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No contacts yet — run AI enrichment to find decision-makers</p>
          </div>
        ) : (
          <div className="space-y-3">
            {company.contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
