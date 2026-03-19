"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DealCard from "./DealCard";
import DealModal from "./DealModal";
import ColumnModal from "./ColumnModal";
import { Column, Deal } from "./types";

interface Props {
  initialColumns: Column[];
}

export default function DealsBoard({ initialColumns }: Props) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);

  // Modals
  const [columnModal, setColumnModal] = useState<{ open: boolean; column?: Column }>({ open: false });
  const [dealModal, setDealModal] = useState<{ open: boolean; deal?: Deal; columnId?: string }>({ open: false });

  // ─── Drag & Drop ──────────────────────────────────────────────
  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, type } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      if (type === "column") {
        // Reorder columns
        const reordered = Array.from(columns);
        const [moved] = reordered.splice(source.index, 1);
        reordered.splice(destination.index, 0, moved);
        const updated = reordered.map((c, i) => ({ ...c, position: i }));
        setColumns(updated);

        // Persist all affected
        await Promise.all(
          updated.map((c) =>
            fetch(`/api/deals/columns/${c.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ position: c.position }),
            })
          )
        );
        return;
      }

      // Reorder / move deals
      const srcCol = columns.find((c) => c.id === source.droppableId)!;
      const dstCol = columns.find((c) => c.id === destination.droppableId)!;

      const srcDeals = Array.from(srcCol.deals);
      const [movedDeal] = srcDeals.splice(source.index, 1);

      if (source.droppableId === destination.droppableId) {
        srcDeals.splice(destination.index, 0, movedDeal);
        const updatedDeals = srcDeals.map((d, i) => ({ ...d, position: i }));
        setColumns((cols) =>
          cols.map((c) => (c.id === srcCol.id ? { ...c, deals: updatedDeals } : c))
        );
        await Promise.all(
          updatedDeals.map((d) =>
            fetch(`/api/deals/${d.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ position: d.position }),
            })
          )
        );
      } else {
        const dstDeals = Array.from(dstCol.deals);
        const updatedDeal = { ...movedDeal, columnId: dstCol.id };
        dstDeals.splice(destination.index, 0, updatedDeal);
        const updatedSrc = srcDeals.map((d, i) => ({ ...d, position: i }));
        const updatedDst = dstDeals.map((d, i) => ({ ...d, position: i }));

        setColumns((cols) =>
          cols.map((c) => {
            if (c.id === srcCol.id) return { ...c, deals: updatedSrc };
            if (c.id === dstCol.id) return { ...c, deals: updatedDst };
            return c;
          })
        );

        await fetch(`/api/deals/${movedDeal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnId: dstCol.id, position: destination.index }),
        });
        await Promise.all(
          [...updatedSrc, ...updatedDst].map((d) =>
            fetch(`/api/deals/${d.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ position: d.position }),
            })
          )
        );
      }
    },
    [columns]
  );

  // ─── Column CRUD ──────────────────────────────────────────────
  async function saveColumn(name: string, color: string, isClosedStage: boolean) {
    if (columnModal.column) {
      // Edit
      const res = await fetch(`/api/deals/columns/${columnModal.column.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, isClosedStage }),
      });
      if (res.ok) {
        setColumns((cols) =>
          cols.map((c) => (c.id === columnModal.column!.id ? { ...c, name, color, isClosedStage } : c))
        );
      }
    } else {
      // Create
      const res = await fetch("/api/deals/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, isClosedStage }),
      });
      if (res.ok) {
        const data = await res.json();
        setColumns((cols) => [...cols, { ...data.column, deals: [] }]);
      }
    }
    setColumnModal({ open: false });
  }

  async function deleteColumn(colId: string) {
    if (!confirm("Delete this column and all its deals?")) return;
    const res = await fetch(`/api/deals/columns/${colId}`, { method: "DELETE" });
    if (res.ok) setColumns((cols) => cols.filter((c) => c.id !== colId));
  }

  // ─── Deal CRUD ────────────────────────────────────────────────
  async function saveDeal(data: Partial<Deal>): Promise<Deal> {
    if (dealModal.deal) {
      // Edit
      const res = await fetch(`/api/deals/${dealModal.deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      const updated: Deal = json.deal;

      setColumns((cols) =>
        cols.map((c) => {
          // Remove from old col if columnId changed
          const filtered = c.deals.filter((d) => d.id !== updated.id);
          if (c.id === updated.columnId) {
            return { ...c, deals: [...filtered, updated].sort((a, b) => a.position - b.position) };
          }
          return { ...c, deals: filtered };
        })
      );
      setDealModal({ open: false });
      return updated;
    } else {
      // Create
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, columnId: data.columnId ?? dealModal.columnId }),
      });
      const json = await res.json();
      const created: Deal = json.deal;

      setColumns((cols) =>
        cols.map((c) =>
          c.id === created.columnId ? { ...c, deals: [...c.deals, created] } : c
        )
      );
      setDealModal({ open: false });
      return created;
    }
  }

  async function deleteDeal() {
    if (!dealModal.deal) return;
    await fetch(`/api/deals/${dealModal.deal.id}`, { method: "DELETE" });
    setColumns((cols) =>
      cols.map((c) => ({ ...c, deals: c.deals.filter((d) => d.id !== dealModal.deal!.id) }))
    );
    setDealModal({ open: false });
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-white text-xl font-semibold">Deals Pipeline</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {columns.reduce((acc, c) => acc + c.deals.length, 0)} deals ·{" "}
            {columns.length} stages
          </p>
        </div>
        <button
          onClick={() => setColumnModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#eb9447] text-black text-sm font-medium hover:bg-[#eb9447]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Stage
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto px-6 py-5">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="column">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 h-full items-start"
                style={{ minWidth: "max-content" }}
              >
                {columns.map((col, colIndex) => (
                  <ColumnItem
                    key={col.id}
                    col={col}
                    colIndex={colIndex}
                    onEdit={() => setColumnModal({ open: true, column: col })}
                    onDelete={() => deleteColumn(col.id)}
                    onAddDeal={() => setDealModal({ open: true, columnId: col.id })}
                    onCardClick={(deal) => setDealModal({ open: true, deal })}
                  />
                ))}
                {provided.placeholder}

                <button
                  onClick={() => setColumnModal({ open: true })}
                  className="flex-shrink-0 w-[280px] flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Stage
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Modals */}
      {columnModal.open && (
        <ColumnModal
          initialName={columnModal.column?.name}
          initialColor={columnModal.column?.color}
          initialIsClosedStage={columnModal.column?.isClosedStage}
          onClose={() => setColumnModal({ open: false })}
          onSave={saveColumn}
        />
      )}

      {dealModal.open && (
        <DealModal
          deal={dealModal.deal}
          columns={columns}
          defaultColumnId={dealModal.columnId}
          onClose={() => setDealModal({ open: false })}
          onSave={saveDeal}
          onDelete={dealModal.deal ? deleteDeal : undefined}
        />
      )}
    </div>
  );
}

// ─── Column Item ──────────────────────────────────────────────────────────────
function ColumnItem({
  col,
  colIndex,
  onEdit,
  onDelete,
  onAddDeal,
  onCardClick,
}: {
  col: Column;
  colIndex: number;
  onEdit: () => void;
  onDelete: () => void;
  onAddDeal: () => void;
  onCardClick: (deal: Deal) => void;
}) {
  const totalValue = col.deals.reduce((acc, d) => acc + (d.value ?? 0), 0);

  return (
    <Draggable draggableId={`col-${col.id}`} index={colIndex}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex-shrink-0 w-[280px] flex flex-col bg-zinc-900 rounded-xl border transition-all ${
            snapshot.isDragging ? "border-[#eb9447]/40 shadow-xl" : "border-zinc-800"
          }`}
        >
          {/* Column Header */}
          <div
            {...provided.dragHandleProps}
            className="flex items-center justify-between px-3 py-3 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: col.color }}
              />
              <span className="text-white text-sm font-semibold truncate">{col.name}</span>
              <span className="text-zinc-500 text-xs">{col.deals.length}</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {totalValue > 0 && (
            <p className="px-3 pb-2 text-emerald-400 text-xs font-medium">
              ${totalValue.toLocaleString()} total
            </p>
          )}

          {/* Deals */}
          <Droppable droppableId={col.id} type="deal">
            {(prov, snap) => (
              <div
                ref={prov.innerRef}
                {...prov.droppableProps}
                className={`flex-1 px-2 pb-2 space-y-2 min-h-[60px] rounded-b-xl transition-colors ${
                  snap.isDraggingOver ? "bg-zinc-800/50" : ""
                }`}
              >
                {col.deals.map((deal, idx) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    index={idx}
                    isClosedStage={col.isClosedStage}
                    onClick={() => onCardClick(deal)}
                  />
                ))}
                {prov.placeholder}
              </div>
            )}
          </Droppable>

          {/* Add Deal */}
          <button
            onClick={onAddDeal}
            className="flex items-center gap-1.5 px-3 py-2.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors border-t border-zinc-800 rounded-b-xl hover:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Deal
          </button>
        </div>
      )}
    </Draggable>
  );
}
