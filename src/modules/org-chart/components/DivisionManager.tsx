"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrgDivision, CreateDivisionInput } from "../lib/types";
import {
  createOrgDivision,
  updateOrgDivision,
  deleteOrgDivision,
} from "../lib/actions";

const PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#64748b",
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PALETTE.map((hex) => (
        <button
          key={hex}
          type="button"
          title={hex}
          onClick={() => onChange(hex)}
          className={cn(
            "size-5 rounded-full border-2 transition-transform hover:scale-110",
            value === hex ? "border-foreground scale-110" : "border-transparent",
          )}
          style={{ background: hex }}
        />
      ))}
    </div>
  );
}

interface DivisionManagerProps {
  divisions: OrgDivision[];
}

export function DivisionManager({ divisions }: DivisionManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const [newName,  setNewName]  = useState("");
  const [newDesc,  setNewDesc]  = useState("");
  const [newColor, setNewColor] = useState(PALETTE[0]);

  const [editName,  setEditName]  = useState("");
  const [editDesc,  setEditDesc]  = useState("");
  const [editColor, setEditColor] = useState(PALETTE[0]);

  function startEdit(div: OrgDivision) {
    setEditingId(div.id);
    setEditName(div.name);
    setEditDesc(div.description ?? "");
    setEditColor(div.color ?? PALETTE[0]);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const input: CreateDivisionInput = {
        name:        newName.trim(),
        description: newDesc.trim() || null,
        color:       newColor,
      };
      await createOrgDivision(input);
      setNewName("");
      setNewDesc("");
      setNewColor(PALETTE[0]);
      setAddingNew(false);
    });
  }

  function handleUpdate(id: string) {
    if (!editName.trim()) return;
    startTransition(async () => {
      await updateOrgDivision(id, {
        name:        editName.trim(),
        description: editDesc.trim() || null,
        color:       editColor,
      });
      setEditingId(null);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete division "${name}"? Departments linked to it will become unlinked.`)) return;
    startTransition(async () => {
      await deleteOrgDivision(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Divisions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Top-level groupings that contain departments.
          </p>
        </div>
        {!addingNew && (
          <Button size="sm" variant="ghost" onClick={() => setAddingNew(true)}>
            <Plus className="mr-1 size-3.5" />
            Add Division
          </Button>
        )}
      </div>

      {addingNew && (
        <div className="rounded-lg border bg-card p-3 space-y-2.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Division name"
            autoFocus
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Color</p>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={isPending || !newName.trim()}>
              <Check className="mr-1 size-3.5" />
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setAddingNew(false); setNewName(""); setNewDesc(""); setNewColor(PALETTE[0]); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {divisions.length === 0 && !addingNew ? (
        <div className="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">
          No divisions yet. Add a division to group your departments.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm divide-y">
          {divisions.map((div) => (
            <div key={div.id} className="px-4 py-3">
              {editingId === div.id ? (
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Color</p>
                    <ColorPicker value={editColor} onChange={setEditColor} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(div.id)} disabled={isPending}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="size-3 flex-none rounded-full"
                      style={{ background: div.color ?? "#6366f1" }}
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{div.name}</span>
                      {div.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{div.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-none">
                    <button
                      type="button"
                      onClick={() => startEdit(div)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(div.id, div.name)}
                      disabled={isPending}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
