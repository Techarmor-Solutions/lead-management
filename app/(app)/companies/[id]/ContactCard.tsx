"use client";

import { Contact } from "@prisma/client";
import { Mail, Phone, Linkedin, User, Search, CheckCircle } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";
import { useState } from "react";

interface Props {
  contact: Contact;
}

export default function ContactCard({ contact }: Props) {
  const [email, setEmail] = useState(contact.email);
  const [enrichmentSummary, setEnrichmentSummary] = useState(contact.enrichmentSummary);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function handleFindEmail() {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/find-email`, { method: "POST" });
      const data = await res.json();
      if (data.email) {
        setEmail(data.email);
        setEnrichmentSummary("Hunter-verified");
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  const isHunterVerified = enrichmentSummary === "Hunter-verified";

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-white hover:text-[#eb9447] transition-colors">
              {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown"}
            </div>
            {contact.title && <div className="text-xs text-zinc-500">{contact.title}</div>}
          </div>
        </Link>
        <StatusBadge status={contact.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
        {email ? (
          <div className="flex items-center gap-1">
            <a href={`mailto:${email}`} className="flex items-center gap-1 hover:text-[#eb9447] transition-colors">
              <Mail className="w-3.5 h-3.5" />
              {email}
            </a>
            {isHunterVerified && (
              <span className="flex items-center gap-0.5 text-emerald-500 ml-1">
                <CheckCircle className="w-3 h-3" />
                verified
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={handleFindEmail}
            disabled={loading}
            className="flex items-center gap-1 text-zinc-500 hover:text-[#eb9447] transition-colors disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            {loading ? "Finding..." : notFound ? "Not found" : "Find Email"}
          </button>
        )}
        {contact.phone && (
          <span className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            {contact.phone}
          </span>
        )}
        {contact.linkedin && (
          <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#eb9447] transition-colors">
            <Linkedin className="w-3.5 h-3.5" />
            LinkedIn
          </a>
        )}
      </div>

      {enrichmentSummary && enrichmentSummary !== "Hunter-verified" && (
        <p className="mt-2 text-xs text-zinc-500 border-t border-zinc-800 pt-2">
          {enrichmentSummary}
        </p>
      )}
    </div>
  );
}
