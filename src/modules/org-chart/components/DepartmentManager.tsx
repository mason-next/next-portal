"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrgDepartment, CreateDepartmentInput } from "../lib/types";
import {
  createOrgDepartment,
  updateOrgDepartment,
  deleteOrgDepartment,
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

interface DepartmentManagerProps {
  departments: OrgDepartment[];
}

export function DepartmentManager({ departments }: DepartmentManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const [newName,  setNewName]  = useState("");
  const [newDesc,  setNewDesc]  = useState("");
  const [newColor, setNewColor] = useState(PALETTE[0]);

  const [editName,  setEditName]  = useState("");
  const [editDesc,  setEditDesc]  = useState("");
  const [editColor, setEditColor] = useState(PALETTE[0]);

  function startEdit(dept: OrgDepartment) {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditDesc(dept.description ?? "");
    setEditColor(dept.color ?? PALETTE[0]);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const input: CreateDepartmentInput = {
        name:        newName.trim(),
        description: newDesc.trim() || null,
        color:       newColor,
      };
      await createOrgDepartment(input);
      setNewName("");
      setNewDesc("");
      setNewColor(PALETTE[0]);
      setAddingNew(false);
    });
  }

  function handleUpdate(id: string) {
    if (!editName.trim()) return;
    startTransition(async () => {
      await updateOrgDepartment(id, {
        name:        editName.trim(),
        description: editDesc.trim() || null,
        color:       editColor,
      });
      setEditingId(null);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete department "${name}"? Positions linked to it will become unlinked.`)) return;
    startTransition(async () => {
      await deleteOrgDepartment(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Departments</h3>
        {!addingNew && (
          <Button size="sm" variant="ghost" onClick={() => setAddingNew(true)}>
            <Plus className="mr-1 size-3.5" />
            Add Department
          </Button>
        )}
      </div>

      {addingNew && (
        <div className="rounded-lg border bg-card p-3 space-y-2.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Department name"
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
            <Button size="sm" variant="ghost" onClick={() => { setAddingNew(false); setNewName(""); setNewDesc(""); setNewColor(PALETTE[0]); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {departments.length === 0 && !addingNew ? (
        <div className="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">
          No departments yet.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm divide-y">
          {departments.map((dept) => (
            <div key={dept.id} className="px-4 py-3">
              {editingId === dept.id ? (
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
                    <Button size="sm" onClick={() => handleUpdate(dept.id)} disabled={isPending}>
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
                      style={{ background: dept.color ?? "#6366f1" }}
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{dept.name}</span>
                      {dept.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-none">
                    <button
                      type="button"
                      onClick={() => startEdit(dept)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(dept.id, dept.name)}
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
