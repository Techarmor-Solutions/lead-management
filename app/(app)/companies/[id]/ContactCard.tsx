"use client";

import { Contact } from "@prisma/client";
import { Mail, Phone, Linkedin, User } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

interface Props {
  contact: Contact;
}

export default function ContactCard({ contact }: Props) {
  return (
    <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-white">
              {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown"}
            </div>
            {contact.title && <div className="text-xs text-zinc-500">{contact.title}</div>}
          </div>
        </div>
        <StatusBadge status={contact.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-[#eb9447] transition-colors">
            <Mail className="w-3.5 h-3.5" />
            {contact.email}
          </a>
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

      {contact.enrichmentSummary && (
        <p className="mt-2 text-xs text-zinc-500 border-t border-zinc-800 pt-2">
          {contact.enrichmentSummary}
        </p>
      )}
    </div>
  );
}
