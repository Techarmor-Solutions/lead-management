"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Deal } from "./types";

interface Props {
  deal: Deal;
  index: number;
  onClick: () => void;
}

export default function DealCard({ deal, index, onClick }: Props) {
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
