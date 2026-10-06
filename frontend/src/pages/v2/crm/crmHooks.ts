import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmApi, type LeadStage } from '@/services/crm';

/** Active pipeline stages in board order (+ the full list incl. inactive ones). */
export function useCrmStages() {
  const q = useQuery({ queryKey: ['crm', 'stages'], queryFn: crmApi.stages, staleTime: 60_000 });
  const all = useMemo<LeadStage[]>(() => q.data ?? [], [q.data]);
  const active = useMemo(() => all.filter((s) => s.isActive).sort((a, b) => a.order - b.order), [all]);
  return { ...q, all, stages: active };
}

export function useCrmCampaigns() {
  return useQuery({ queryKey: ['crm', 'campaigns'], queryFn: crmApi.campaigns, staleTime: 30_000 });
}

export function useCrmAssignees() {
  return useQuery({ queryKey: ['crm', 'assignees'], queryFn: crmApi.assignees, staleTime: 5 * 60_000 });
}

export function useCrmBadges() {
  return useQuery({
    queryKey: ['crm', 'badges'],
    queryFn: crmApi.badges,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
}
