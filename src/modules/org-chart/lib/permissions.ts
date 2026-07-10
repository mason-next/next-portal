import { getEffectiveLevel, type RolePermissionsConfig } from "@/lib/module-permissions";

export function canViewOrgChart(roleTypes: string[], config?: RolePermissionsConfig): boolean {
  return getEffectiveLevel(roleTypes, "orgChart", config) !== "none";
}

export function canEditOrgChart(roleTypes: string[], config?: RolePermissionsConfig): boolean {
  const level = getEffectiveLevel(roleTypes, "orgChart", config);
  return level === "member" || level === "administrator";
}

export function canViewSensitiveOrgChartData(roleTypes: string[], config?: RolePermissionsConfig): boolean {
  return getEffectiveLevel(roleTypes, "orgChart", config) === "administrator";
}

export function canManageOrgChart(roleTypes: string[], config?: RolePermissionsConfig): boolean {
  return getEffectiveLevel(roleTypes, "orgChart", config) === "administrator";
}
