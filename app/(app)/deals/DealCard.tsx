"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Clock, Calendar } from "lucide-react";
import { Deal } from "./types";

interface Props {
  deal: Deal;
  index: number;
  isClosedStage: boolean;
  onClick: () => void;
}

function formatDuration(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "< 1 day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DealCard({ deal, index, isClosedStage, onClick }: Props) {
  const currentEntry = deal.stageHistory.find((h) => !h.exitedAt);
  const timeInStage = currentEntry && !isClosedStage
    ? formatDuration(Date.now() - new Date(currentEntry.enteredAt).getTime())
    : null;

  const isOverdue = deal.closeDate && new Date(deal.closeDate) < new Date() && !isClosedStage;

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-zinc-800 border rounded-lg p-3 cursor-pointer select-none transition-shadow ${
            snapshot.isDragging
              ? "border-[#eb9447]/60 shadow-lg shadow-black/40"
              : "border-zinc-700 hover:border-zinc-500"
          }`}
        >
          <p className="text-white text-sm font-medium leading-snug">{deal.title}</p>

          {deal.value != null && (
            <p className="text-emerald-400 text-xs font-medium mt-1">
              ${deal.value.toLocaleString()}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {timeInStage && (
              <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                <Clock className="w-3 h-3" />
                {timeInStage}
              </span>
            )}
            {deal.closeDate && (
              <span className={`flex items-center gap-1 text-[11px] ${isOverdue ? "text-red-400" : "text-zinc-400"}`}>
                <Calendar className="w-3 h-3" />
                {formatDate(deal.closeDate)}
              </span>
            )}
          </div>

          {deal.contacts.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {deal.contacts.slice(0, 4).map((dc) => (
                <div
                  key={dc.contactId}
                  title={`${dc.contact.firstName} ${dc.contact.lastName}`}
                  className="w-6 h-6 rounded-full bg-[#eb9447]/20 text-[#eb9447] flex items-center justify-center text-[10px] font-semibold border border-zinc-700"
                >
                  {dc.contact.firstName?.[0] ?? "?"}
                </div>
              ))}
              {deal.contacts.length > 4 && (
                <span className="text-zinc-500 text-[10px]">+{deal.contacts.length - 4}</span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
