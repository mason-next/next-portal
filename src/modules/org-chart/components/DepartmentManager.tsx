"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrgDepartment, CreateDepartmentInput } from "../lib/types";
import {
  createOrgDepartment,
  updateOrgDepartment,
  deleteOrgDepartment,
} from "../lib/actions";

interface DepartmentManagerProps {
  departments: OrgDepartment[];
}

export function DepartmentManager({ departments }: DepartmentManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  function startEdit(dept: OrgDepartment) {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditDesc(dept.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const input: CreateDepartmentInput = {
        name: newName.trim(),
        description: newDesc.trim() || null,
      };
      await createOrgDepartment(input);
      setNewName("");
      setNewDesc("");
      setAddingNew(false);
    });
  }

  function handleUpdate(id: string) {
    if (!editName.trim()) return;
    startTransition(async () => {
      await updateOrgDepartment(id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
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
        <div className="rounded-lg border bg-card p-3 space-y-2">
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
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={isPending || !newName.trim()}>
              <Check className="mr-1 size-3.5" />
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingNew(false); setNewName(""); setNewDesc(""); }}>
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
                <div className="space-y-2">
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
                  <div>
                    <span className="text-sm font-medium">{dept.name}</span>
                    {dept.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{dept.description}</p>
                    )}
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
