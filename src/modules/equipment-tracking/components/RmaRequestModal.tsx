"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useSession } from "@/lib/auth/client";
import { formatDate } from "@/lib/utils";
import { buildRmaRequestEmail } from "@/modules/email-templates/templates/rma-request";
import type { EquipmentRow } from "@/types/equipment";
import type { Project } from "@/types/project";

const REASON_PRESETS = ["Defective", "Wrong Item Shipped", "Damaged in Transit", "No Longer Needed"];

interface RmaRequestModalProps {
  row: EquipmentRow;
  project: Project;
  onClose: () => void;
  onRequested: () => void;
}

export function RmaRequestModal({ row, project, onClose, onRequested }: RmaRequestModalProps) {
  const session = useSession();
  const { users } = useUsersContext();
  const [reason, setReason] = useState("");
  const [returnQty, setReturnQty] = useState(row.qty);
  const [toast, setToast] = useState<string | null>(null);

  const currentUser = users.find((u) => u.id === session.id) ?? null;

  const email = buildRmaRequestEmail({
    projectName: project.name,
    projectNumber: project.projectNumber,
    seq: row.seq,
    mfr: row.mfr,
    product: row.product,
    desc: row.desc,
    orderedQty: row.qty,
    returnQty,
    reason,
    requestedByName: session.name,
    requestedByEmail: currentUser?.email ?? session.email,
  });

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }

  async function copyHtml() {
    await navigator.clipboard.writeText(email.html);
    onRequested();
    showToast("Copied HTML to clipboard");
  }

  async function openMailto() {
    try {
      const htmlBlob = new Blob([email.html], { type: "text/html" });
      const textBlob = new Blob([email.plainText], { type: "text/plain" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })]);
    } catch {
      // Clipboard access denied — the draft will just open blank with nothing to paste.
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(email.subject)}`;
    onRequested();
    showToast("Draft opened — paste (Ctrl+V) into the body for the formatted email");
  }

  return (
    <>
      <Modal open onClose={onClose} className="max-w-3xl">
        <h2 className="mb-1 text-lg font-semibold">Generate RMA Request</h2>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {row.mfr} {row.product} · {row.desc}
          </p>
          {row.rmaRequestedAt ? (
            <p className="mt-1 text-xs text-amber-600">
              An RMA was already requested for this item on {formatDate(row.rmaRequestedAt)}.
            </p>
          ) : null}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="block">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">Quantity to Return</div>
            <input
              type="number"
              min={1}
              max={row.qty}
              value={returnQty}
              onChange={(e) => setReturnQty(Math.max(1, Math.min(row.qty || 1, Number(e.target.value) || 1)))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="mb-1 text-xs font-semibold text-muted-foreground">Reason for Return</div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {REASON_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
            >
              {preset}
            </button>
          ))}
        </div>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the reason for this return…"
          className="mb-4 w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus:border-primary"
        />

        <iframe srcDoc={email.html} title="RMA request preview" className="h-[420px] w-full rounded-lg border" />

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={copyHtml}>
            Copy HTML
          </Button>
          <Button variant="outline" onClick={openMailto}>
            Open Outlook Draft
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-30 rounded-md bg-foreground px-3.5 py-2.5 text-sm text-background shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}
