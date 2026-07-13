"use client";

import { useEffect, useState, useTransition } from "react";
import { Network } from "lucide-react";
import {
  getOrgChartFormSections,
  updateOrgChartFormSections,
} from "../lib/form-settings";
import { DEFAULT_FORM_SECTIONS } from "../lib/form-settings-constants";
import type { OrgChartFormSections } from "../lib/types";

const SECTIONS: { key: keyof OrgChartFormSections; label: string; description: string }[] = [
  {
    key: "bio",
    label: "Bio Description",
    description: "Short professional bio for the person in this role",
  },
  {
    key: "certifications",
    label: "Required Certifications",
    description: "Certification requirements linked to the position",
  },
  {
    key: "careerPaths",
    label: "Career Paths",
    description: "Other roles this position can advance to",
  },
  {
    key: "compensation",
    label: "Compensation & Budget",
    description: "Salary bands, pay frequency, and budget status",
  },
  {
    key: "successors",
    label: "Successors",
    description: "Ranked candidates to fill this role in the future",
  },
  {
    key: "matrixRelationships",
    label: "Matrix Relationships",
    description: "Dotted-line, project, and mentorship relationships",
  },
  {
    key: "targetHireDate",
    label: "Target Hire Date",
    description: "Expected date for filling an open or planned position",
  },
  {
    key: "notes",
    label: "Notes",
    description: "Internal free-form notes about the position",
  },
];

export function OrgChartSettingsCard() {
  const [sections, setSections] = useState<OrgChartFormSections>(DEFAULT_FORM_SECTIONS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getOrgChartFormSections().then((s) => {
      setSections(s);
      setLoaded(true);
    });
  }, []);

  function toggle(key: keyof OrgChartFormSections) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await updateOrgChartFormSections(sections);
      setSaved(true);
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Network className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Org Chart — Position Form Sections</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which sections administrators see in the Add / Edit Position form.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={isPending || !loaded}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </div>

      {!loaded ? (
        <div className="py-4 text-center text-xs text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SECTIONS.map(({ key, label, description }) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={sections[key]}
                onChange={() => toggle(key)}
                className="mt-0.5 rounded"
              />
              <div className="min-w-0">
                <span className="block text-sm font-medium leading-snug">{label}</span>
                <span className="block text-xs text-muted-foreground leading-snug">{description}</span>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
