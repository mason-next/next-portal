"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSalesLogos,
  getSalesActivities,
  upsertSalesLogo,
  deleteSalesLogo,
  createSalesActivity,
  deleteSalesActivity,
  getActivitySummary,
} from "@/lib/data/sales-activity";
import type { SalesLogo, SalesActivity, ActivitySummary } from "@/types/sales";
import { getWeekStart } from "@/types/sales";

export function useSalesActivity(ownerFilter?: string) {
  const [logos, setLogos] = useState<SalesLogo[]>([]);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [weekStart, setWeekStart] = useState(getWeekStart());

  const bump = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([
      getSalesLogos(),
      getSalesActivities({ weekStart, userId: ownerFilter }),
      getActivitySummary(weekStart),
    ]).then(([l, a, s]) => {
      if (!active) return;
      setLogos(l);
      setActivities(a);
      setSummary(s);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [reloadToken, ownerFilter, weekStart]);

  const saveLogo = useCallback(async (logo: Partial<SalesLogo> & { company: string }) => {
    await upsertSalesLogo({
      ...(logo.id ? { id: logo.id } : {}),
      company: logo.company,
      domain: logo.domain ?? "",
      stage: logo.stage ?? "Prospecting",
      ownerId: logo.ownerId ?? null,
      ownerName: logo.ownerName ?? "",
      notes: logo.notes ?? "",
      dealDeskId: logo.dealDeskId ?? null,
    });
    bump();
  }, [bump]);

  const removeLogo = useCallback(async (id: string) => {
    await deleteSalesLogo(id);
    bump();
  }, [bump]);

  const logActivity = useCallback(async (activity: Omit<SalesActivity, "id" | "createdAt">) => {
    await createSalesActivity(activity);
    bump();
  }, [bump]);

  const removeActivity = useCallback(async (id: string) => {
    await deleteSalesActivity(id);
    bump();
  }, [bump]);

  return {
    logos, activities, summary, isLoading,
    weekStart, setWeekStart,
    saveLogo, removeLogo, logActivity, removeActivity, bump,
  };
}
