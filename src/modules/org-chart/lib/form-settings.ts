"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/server";
import { getRolePermissions } from "@/lib/data/role-permissions";
import { canManageOrgChart } from "./permissions";
import type { OrgChartFormSections } from "./types";
import { DEFAULT_FORM_SECTIONS } from "./form-settings-constants";

const SETTING_KEY = "org_chart_form_sections";

export async function getOrgChartFormSections(): Promise<OrgChartFormSections> {
  const row = await db.appSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return { ...DEFAULT_FORM_SECTIONS };
  const stored = row.value as Partial<OrgChartFormSections>;
  return { ...DEFAULT_FORM_SECTIONS, ...stored };
}

export async function updateOrgChartFormSections(sections: OrgChartFormSections): Promise<void> {
  const session = await requireSession();
  const permConfig = await getRolePermissions();
  if (!canManageOrgChart(session.roleTypes, permConfig)) throw new Error("Forbidden");
  await db.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: sections as object },
    create: { key: SETTING_KEY, value: sections as object },
  });
  revalidatePath("/org-chart");
  revalidatePath("/admin");
}
