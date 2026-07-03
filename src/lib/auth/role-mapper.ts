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
