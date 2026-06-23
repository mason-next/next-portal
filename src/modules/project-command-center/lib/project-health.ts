import type { StatusTone } from "@/components/shared/StatusBadge";
import type { ProjectHealth } from "@/types/project";

export const HEALTH_TONE: Record<ProjectHealth, StatusTone> = {
  Ahead: "info",
  "On Track": "success",
  "At Risk": "warning",
  "Off Track": "danger",
};
