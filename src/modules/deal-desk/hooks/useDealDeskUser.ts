"use client";

import { useSession } from "@/lib/auth/client";
import { useViewAs } from "@/lib/view-as/ViewAsContext";
import type { AccountType } from "@/types/user";

export interface PreviewUser {
  name: string;
  accountType: AccountType;
}

export function useDealDeskUser() {
  const session = useSession();
  const { viewAsUser, isViewAsMode } = useViewAs();

  const actuallyManagement =
    session.roleTypes.includes("Administrator") ||
    session.roleTypes.includes("Management") ||
    session.roleTypes.includes("Sales");

  // When global ViewAs is active, scope data to the viewed user
  const isManagement = actuallyManagement && !isViewAsMode;
  const userName = isViewAsMode ? (viewAsUser?.name ?? session.name) : session.name;

  return {
    userName,
    isManagement,
    actuallyManagement,
    previewAsSalesperson: isViewAsMode,
    previewUser: viewAsUser
      ? {
          name: viewAsUser.name,
          accountType: (viewAsUser.roleTypes.includes("Administrator")
            ? "Administrator"
            : "Member") as AccountType,
        }
      : null,
    // no-ops — ViewAs is now handled globally via the header
    setPreviewAs: (_user: PreviewUser | null) => {},
    togglePreview: () => {},
  };
}
