"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PROJECT_TYPE_CONFIG,
  PROJECT_TYPES,
  SECTION_LABEL,
  WORKFLOW_STEP_TEMPLATE,
  type ProjectTypeWorkflowConfig,
} from "@/modules/project-command-center/lib/workflow-steps";
import { getProjectTypeConfig, saveProjectTypeConfig } from "@/lib/data/workflow-type-config";
import type { ProjectSectionKey } from "@/types/workflow";

const SECTION_ORDER: ProjectSectionKey[] = ["setup", "engineering", "procurement", "implementation", "closeout"];

export function WorkflowTemplateTab() {
  const [config, setConfig] = useState<ProjectTypeWorkflowConfig>(DEFAULT_PROJECT_TYPE_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjectTypeConfig().then((c) => { setConfig(c); setLoading(false); });
  }, []);

  function isIncluded(stepKey: string, projectType: string): boolean {
    const excl = config.exclusions[stepKey] ?? [];
    return !excl.includes(projectType);
  }

  function toggleInclusion(stepKey: string, projectType: string, include: boolean) {
    setConfig((prev) => {
      const excl = prev.exclusions[stepKey] ?? [];
      const next = include
        ? excl.filter((t) => t !== projectType)
        : [...excl.filter((t) => t !== projectType), projectType];
      return {
        exclusions: {
          ...prev.exclusions,
          [stepKey]: next,
        },
      };
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveProjectTypeConfig(config);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setConfig(DEFAULT_PROJECT_TYPE_CONFIG);
    setSaved(false);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const bySection = SECTION_ORDER.map((section) => ({
    section,
    label: SECTION_LABEL[section],
    steps: WORKFLOW_STEP_TEMPLATE.filter((t) => t.section === section),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Workflow Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure which workflow steps are included for each project type.
          A step is excluded from a project only when <strong>all</strong> of the project&apos;s types exclude it.
          Multi-type projects inherit any step included by at least one of their types.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Step</th>
              {PROJECT_TYPES.map((type) => (
                <th key={type} className="px-3 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">
                  {type}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bySection.map(({ section, label, steps }) => (
              <>
                <tr key={`section-${section}`} className="border-b bg-muted/20">
                  <td
                    colSpan={PROJECT_TYPES.length + 1}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {label}
                  </td>
                </tr>
                {steps.map((step) => (
                  <tr key={step.key} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium">{step.name}</td>
                    {PROJECT_TYPES.map((type) => (
                      <td key={type} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary cursor-pointer"
                          checked={isIncluded(step.key, type)}
                          onChange={(e) => toggleInclusion(step.key, type, e.target.checked)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Configuration"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            ✓ Configuration saved
          </span>
        )}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-300">
        <strong>Note:</strong> Changes here affect only new projects and projects that have not yet
        had their workflow steps seeded. Existing projects are not automatically updated.
      </div>
    </div>
  );
}
