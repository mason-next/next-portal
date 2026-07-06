import type { RoleType } from "@/types/user";

/**
 * Normalizes a raw roleType string (which may be a legacy DB enum value)
 * into a current platform RoleType.  Called at login and when reading JWTs
 * that were issued before the role-type migration.
 */
export function toSessionRoleType(rawRole: string): RoleType {
  switch (rawRole) {
    case "Sales":
    case "Salesperson":
      return "Sales";
    case "Engineering":
    case "Engineer":
      return "Engineering";
    case "ProjectManagement":
    case "ProjectManager":
      return "ProjectManagement";
    case "Management":
    case "Executive":
    case "Operations":
    case "HR":
    case "Other":
      return "Management";
    case "Installation":
    case "Technician":
    case "FieldTechnician":
      return "Installation";
    case "Finance":
      return "Finance";
    case "Customer":
      return "Customer";
    case "Subcontractor":
    case "Vendor":
      return "Subcontractor";
    default:
      return "Management";
  }
}

/**
 * Derives a roleTypes array from legacy JWT fields (accountType + roleType).
 * Used only for backward compat when reading old tokens that predate the refactor.
 */
export function toSessionRoleTypes(accountType?: string, roleType?: string): string[] {
  const base = toSessionRoleType(roleType ?? "Management");
  if (accountType === "Administrator") {
    return base === "Administrator" ? ["Administrator"] : [base, "Administrator"];
  }
  return [base];
}
