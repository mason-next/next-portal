// Org Chart permission helpers — isolated to this module.
// Uses the existing roleTypes[] from SessionUser; no new permission concept.

export function canEditOrgChart(roleTypes: string[]): boolean {
  return roleTypes.includes("Administrator");
}

export function canViewSensitiveOrgChartData(roleTypes: string[]): boolean {
  return roleTypes.includes("Administrator");
}

export function canManageOrgChart(roleTypes: string[]): boolean {
  return roleTypes.includes("Administrator");
}
