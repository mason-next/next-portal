"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSalesCompanies,
  getSalesActivities,
  upsertSalesCompany,
  deleteSalesCompany,
  upsertSalesOpportunity,
  deleteSalesOpportunity,
  updateOpportunityStage,
  createSalesActivity,
  updateSalesActivity,
  deleteSalesActivity,
  getActivitySummary,
} from "@/lib/data/sales-activity";
import type { SalesCompany, SalesOpportunity, SalesActivity, OppStage, ActivitySummary } from "@/types/sales";
import { getWeekStart } from "@/types/sales";

interface ActivitySummaryState {
  totalActivities: number;
  byType: Record<string, number>;
  byPerson: Record<string, number>;
}

export function useSalesActivity({ scopeToUser }: { scopeToUser?: string } = {}) {
  const [companies, setCompanies] = useState<SalesCompany[]>([]);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [allActivities, setAllActivities] = useState<SalesActivity[]>([]);
  const [summary, setSummary] = useState<ActivitySummaryState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [weekStart, setWeekStart] = useState(getWeekStart());

  const bump = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([
      getSalesCompanies(scopeToUser),
      getSalesActivities({ weekStart, userName: scopeToUser }),
      getSalesActivities({ userName: scopeToUser }),
      getActivitySummary(weekStart, scopeToUser),
    ]).then(([c, a, all, s]) => {
      if (!active) return;
      setCompanies(c);
      setActivities(a);
      setAllActivities(all);
      setSummary(s);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [reloadToken, weekStart, scopeToUser]);

  const saveCompany = useCallback(async (
    data: Omit<SalesCompany, "id" | "createdAt" | "updatedAt" | "opportunities"> & { id?: string }
  ) => {
    const result = await upsertSalesCompany(data);
    bump();
    return result;
  }, [bump]);

  const removeCompany = useCallback(async (id: string) => {
    await deleteSalesCompany(id);
    bump();
  }, [bump]);

  const saveOpportunity = useCallback(async (
    data: Omit<SalesOpportunity, "id" | "createdAt" | "updatedAt" | "company"> & { id?: string }
  ) => {
    const result = await upsertSalesOpportunity(data);
    bump();
    return result;
  }, [bump]);

  const removeOpportunity = useCallback(async (id: string) => {
    await deleteSalesOpportunity(id);
    bump();
  }, [bump]);

  const changeOppStage = useCallback(async (id: string, stage: OppStage) => {
    await updateOpportunityStage(id, stage);
    bump();
  }, [bump]);

  const logActivity = useCallback(async (activity: Omit<SalesActivity, "id" | "createdAt" | "company" | "opportunity">) => {
    await createSalesActivity(activity);
    bump();
  }, [bump]);

  const editActivity = useCallback(async (id: string, data: Partial<Omit<SalesActivity, "id" | "createdAt" | "company" | "opportunity">>) => {
    await updateSalesActivity(id, data);
    bump();
  }, [bump]);

  const removeActivity = useCallback(async (id: string) => {
    await deleteSalesActivity(id);
    bump();
  }, [bump]);

  return {
    companies, activities, allActivities, summary, isLoading,
    weekStart, setWeekStart,
    saveCompany, removeCompany,
    saveOpportunity, removeOpportunity, changeOppStage,
    logActivity, editActivity, removeActivity, bump,
  };
}
