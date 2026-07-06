"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getTemplateGroups,
  createTemplateGroup,
  updateTemplateGroup,
  deleteTemplateGroup,
  createTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
  createTemplateSubtask,
  updateTemplateSubtask,
  deleteTemplateSubtask,
  seedDefaultTemplates,
  type TemplateGroup,
  type TemplateItem,
  type TemplateSubtask,
} from "@/lib/data/template-management";
import { WORKFLOW_STEP_KEYS } from "@/types/workflow";

const FIELD_CLASS =
  "h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:border-primary";

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function TaskTemplatesTab() {
  const [groups, setGroups] = useState<TemplateGroup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);

  async function load() {
    setLoading(true);
    const data = await getTemplateGroups();
    setGroups(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSeedDefaults() {
    if (!confirm("This will add the built-in templates (Installation, Programming, Commissioning) without overwriting existing ones. Continue?")) return;
    setSeeding(true);
    try {
      await seedDefaultTemplates();
      await load();
    } finally {
      setSeeding(false);
    }
  }

  function handleGroupUpdated(updated: TemplateGroup) {
    setGroups((prev) => prev ? prev.map((g) => (g.id === updated.id ? updated : g)) : [updated]);
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm("Delete this template group and all its tasks? This cannot be undone.")) return;
    await deleteTemplateGroup(groupId);
    setGroups((prev) => prev ? prev.filter((g) => g.id !== groupId) : []);
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Task Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage reusable task templates that can be loaded into project workflow steps.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seeding}>
            <RefreshCw className={cn("mr-1.5 size-4", seeding && "animate-spin")} />
            {seeding ? "Seeding…" : "Seed Defaults"}
          </Button>
          <Button size="sm" onClick={() => setShowAddGroup(true)}>
            <Plus className="mr-1.5 size-4" />
            New Group
          </Button>
        </div>
      </div>

      {showAddGroup && (
        <AddGroupForm
          onSave={async (input) => {
            const created = await createTemplateGroup(input);
            setGroups((prev) => (prev ? [...prev, created] : [created]));
            setShowAddGroup(false);
          }}
          onCancel={() => setShowAddGroup(false)}
        />
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading templates…</div>
      ) : !groups || groups.length === 0 ? (
        <div className="rounded-xl border border-dashed py-14 text-center">
          <p className="text-sm font-medium">No templates configured.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click &ldquo;Seed Defaults&rdquo; to add built-in templates, or create a new group.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <TemplateGroupCard
              key={group.id}
              group={group}
              onUpdated={handleGroupUpdated}
              onDeleted={() => handleDeleteGroup(group.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Add Group Form ───────────────────────────────────────────────────────────

function AddGroupForm({
  onSave,
  onCancel,
}: {
  onSave: (input: { name: string; stepKey: string; description?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [stepKey, setStepKey] = useState("installation");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), stepKey, description });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold">New Template Group</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Name *</label>
          <input
            className={FIELD_CLASS}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Installation"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Workflow Step Key</label>
          <select
            className={FIELD_CLASS}
            value={stepKey}
            onChange={(e) => setStepKey(e.target.value)}
          >
            {WORKFLOW_STEP_KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
            <option value="custom">custom</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Description</label>
        <input
          className={FIELD_CLASS}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description…"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Creating…" : "Create Group"}
        </Button>
      </div>
    </div>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function TemplateGroupCard({
  group,
  onUpdated,
  onDeleted,
}: {
  group: TemplateGroup;
  onUpdated: (updated: TemplateGroup) => void;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editKey, setEditKey] = useState(group.stepKey);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [tasks, setTasks] = useState<TemplateItem[]>(group.tasks);

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await updateTemplateGroup(group.id, { name: editName.trim(), stepKey: editKey });
      onUpdated({ ...updated, tasks });
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleAddTask(title: string, description: string) {
    const created = await createTemplateItem(group.id, { title, description });
    setTasks((prev) => [...prev, created]);
    setShowAddTask(false);
  }

  async function handleDeleteTask(itemId: string) {
    if (!confirm("Delete this task and all its subtasks?")) return;
    await deleteTemplateItem(itemId);
    setTasks((prev) => prev.filter((t) => t.id !== itemId));
  }

  function handleTaskUpdated(updated: TemplateItem) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/10">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex-none text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              className="h-7 flex-1 rounded border border-input bg-background px-2 text-sm outline-none focus:border-primary"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
            <select
              className="h-7 rounded border border-input bg-background px-2 text-xs outline-none focus:border-primary"
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
            >
              {WORKFLOW_STEP_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
              <option value="custom">custom</option>
            </select>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setEditName(group.name); setEditKey(group.stepKey); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold">{group.name}</span>
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {group.stepKey}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onDeleted}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
              <Button size="sm" variant="ghost" onClick={() => { setExpanded(true); setShowAddTask(true); }} className="h-7 px-2.5 text-xs ml-1">
                <Plus className="mr-1 size-3.5" />
                Add Task
              </Button>
            </div>
          </>
        )}
      </div>

      {expanded && (
        <div className="divide-y">
          {showAddTask && (
            <div className="px-4 py-3 bg-muted/10">
              <AddTaskForm
                onSave={handleAddTask}
                onCancel={() => setShowAddTask(false)}
              />
            </div>
          )}
          {tasks.length === 0 && !showAddTask ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No tasks yet.{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setShowAddTask(true)}
              >
                Add the first one
              </button>
            </div>
          ) : (
            tasks.map((task) => (
              <TemplateTaskRow
                key={task.id}
                task={task}
                onUpdated={handleTaskUpdated}
                onDeleted={() => handleDeleteTask(task.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Task Form ────────────────────────────────────────────────────────────

function AddTaskForm({
  onSave,
  onCancel,
}: {
  onSave: (title: string, description: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try { await onSave(title.trim(), description); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-2">
      <input
        className={FIELD_CLASS}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title…"
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
      />
      <input
        className={FIELD_CLASS}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)…"
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? "Adding…" : "Add Task"}
        </Button>
      </div>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TemplateTaskRow({
  task,
  onUpdated,
  onDeleted,
}: {
  task: TemplateItem;
  onUpdated: (updated: TemplateItem) => void;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [subtasks, setSubtasks] = useState<TemplateSubtask[]>(task.subtasks);
  const [showAddSub, setShowAddSub] = useState(false);
  const [newSub, setNewSub] = useState("");

  async function handleSaveEdit() {
    if (!editTitle.trim()) return;
    await updateTemplateItem(task.id, { title: editTitle.trim() });
    onUpdated({ ...task, title: editTitle.trim(), subtasks });
    setEditing(false);
  }

  async function handleAddSubtask() {
    if (!newSub.trim()) return;
    const created = await createTemplateSubtask(task.id, newSub.trim());
    setSubtasks((prev) => [...prev, created]);
    setNewSub("");
    setShowAddSub(false);
  }

  async function handleDeleteSubtask(subId: string) {
    await deleteTemplateSubtask(subId);
    setSubtasks((prev) => prev.filter((s) => s.id !== subId));
  }

  async function handleUpdateSubtask(subId: string, title: string) {
    await updateTemplateSubtask(subId, { title });
    setSubtasks((prev) => prev.map((s) => (s.id === subId ? { ...s, title } : s)));
  }

  return (
    <div className="group">
      <div className="flex items-center gap-2 px-5 py-2.5 hover:bg-muted/10 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex-none text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>

        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              className="h-7 flex-1 rounded border border-input bg-background px-2 text-sm outline-none focus:border-primary"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
            />
            <button type="button" onClick={handleSaveEdit} className="text-emerald-600 hover:text-emerald-700">
              <Check className="size-4" />
            </button>
            <button type="button" onClick={() => { setEditing(false); setEditTitle(task.title); }} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm">{task.title}</span>
            {subtasks.length > 0 && (
              <span className="text-xs text-muted-foreground">{subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""}</span>
            )}
            <div className="hidden group-hover:flex items-center gap-1">
              <button type="button" onClick={() => setEditing(true)} className="p-1 text-muted-foreground hover:text-foreground">
                <Pencil className="size-3" />
              </button>
              <button type="button" onClick={() => { setExpanded(true); setShowAddSub(true); }} className="p-1 text-muted-foreground hover:text-foreground">
                <Plus className="size-3" />
              </button>
              <button type="button" onClick={onDeleted} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {expanded && (
        <div className="pl-12 pr-5 pb-2 space-y-1">
          {subtasks.map((sub) => (
            <SubtaskRow
              key={sub.id}
              subtask={sub}
              onUpdate={(title) => handleUpdateSubtask(sub.id, title)}
              onDelete={() => handleDeleteSubtask(sub.id)}
            />
          ))}
          {showAddSub ? (
            <div className="flex gap-2 py-1">
              <input
                className="h-7 flex-1 rounded border border-input bg-background px-2 text-sm outline-none focus:border-primary"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                placeholder="Subtask title…"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              />
              <button type="button" onClick={handleAddSubtask} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-40" disabled={!newSub.trim()}>
                <Check className="size-4" />
              </button>
              <button type="button" onClick={() => { setShowAddSub(false); setNewSub(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddSub(true)}
              className="py-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              + Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Subtask Row ──────────────────────────────────────────────────────────────

function SubtaskRow({
  subtask,
  onUpdate,
  onDelete,
}: {
  subtask: TemplateSubtask;
  onUpdate: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);

  async function handleSave() {
    if (!editTitle.trim()) return;
    await onUpdate(editTitle.trim());
    setEditing(false);
  }

  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/20">
      <span className="flex-none text-muted-foreground/40 text-xs">–</span>
      {editing ? (
        <div className="flex flex-1 items-center gap-1.5">
          <input
            className="h-6 flex-1 rounded border border-input bg-background px-2 text-xs outline-none focus:border-primary"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <button type="button" onClick={handleSave} className="text-emerald-600 hover:text-emerald-700">
            <Check className="size-3.5" />
          </button>
          <button type="button" onClick={() => { setEditing(false); setEditTitle(subtask.title); }} className="text-muted-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-xs">{subtask.title}</span>
          <div className="hidden group-hover:flex items-center gap-1">
            <button type="button" onClick={() => setEditing(true)} className="p-0.5 text-muted-foreground hover:text-foreground">
              <Pencil className="size-3" />
            </button>
            <button type="button" onClick={() => onDelete()} className="p-0.5 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
