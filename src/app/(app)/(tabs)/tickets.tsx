import type { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ChipGroup, Segmented } from '@/components/chip-group';
import { HeaderIconButton, Screen } from '@/components/screen';
import { STATUS_ICONS } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { TicketRow } from '@/components/ticket-row';
import { useColors } from '@/constants/brand';
import { spacing, statusColors, TAB_BAR_CLEARANCE } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useApi, useCursorList } from '@/hooks/use-api';
import { departmentVisual } from '@/lib/department-icons';
import { departmentApi, managerApi, ticketApi } from '@/lib/endpoints';
import { STATUS_LABELS } from '@/lib/format';
import { fetchDepartmentTickets } from '@/lib/ticket-filters';
import { can } from '@/lib/permissions';
import { TICKET_STATUSES, type TicketStatus, type UserRole } from '@/lib/types';

type Scope = 'mine' | 'team' | 'all';
type StatusFilter = TicketStatus | 'ALL';
type IconName = keyof typeof Ionicons.glyphMap;
type ScopeOption = { value: Scope; label: string; icon: IconName };

const ALL_DEPARTMENTS = 'ALL';

const PAGE_SIZE = 15;

function scopesFor(role: UserRole): ScopeOption[] {
  const scopes: ScopeOption[] = [];
  // The CEO approves rather than raises, so they get no "My tickets" tab.
  if (role !== 'CEO') scopes.push({ value: 'mine', label: 'My tickets', icon: 'person-outline' });
  if (can.viewDepartmentTickets(role)) scopes.push({ value: 'team', label: 'Department', icon: 'business-outline' });
  if (can.viewOrgTickets(role)) scopes.push({ value: 'all', label: 'All tickets', icon: 'layers-outline' });
  return scopes;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string; icon: IconName; tint?: string }[] = [
  // No tint: the chip follows the role's brand color.
  { value: 'ALL', label: 'All', icon: 'apps-outline' },
  ...TICKET_STATUSES.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
    icon: STATUS_ICONS[status],
    tint: statusColors[status].text,
  })),
];

export default function TicketsScreen() {
  const palette = useColors();
  const user = useCurrentUser();
  const params = useLocalSearchParams<{ scope?: Scope; status?: TicketStatus; departmentId?: string }>();
  const scopes = scopesFor(user.role);
  // Open on the wider view when there's a choice (Department / All tickets), else the only tab.
  const defaultScope = scopes.length > 1 ? scopes[1].value : (scopes[0]?.value ?? 'mine');

  const [scope, setScope] = useState<Scope>(defaultScope);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [departmentId, setDepartmentId] = useState<string>(ALL_DEPARTMENTS);

  // Managers filter across the departments they run; org admins across every department.
  const departments = useApi(async () => {
    if (scope === 'team') return (await managerApi.myDepartments()).data;
    if (scope === 'all') return (await departmentApi.list()).data;
    return [];
  }, [scope]);
  const departmentOptions = [
    { value: ALL_DEPARTMENTS, label: 'All departments', icon: 'grid-outline' as const },
    ...(departments.data ?? []).map((department) => ({
      value: department.id,
      label: department.name,
      ...departmentVisual(department.name, palette.departmentTints),
    })),
  ];
  const showDepartmentFilter = scope !== 'mine' && departmentOptions.length > 2;
  const selectedDepartment = showDepartmentFilter && departmentId !== ALL_DEPARTMENTS ? departmentId : undefined;

  const changeScope = (next: Scope) => {
    setScope(next);
    setDepartmentId(ALL_DEPARTMENTS);
  };

  // Dashboard shortcuts deep-link into a scope and status; apply them whenever
  // they change (adjusting state during render rather than in an effect).
  const paramsKey = `${params.scope ?? ''}|${params.status ?? ''}|${params.departmentId ?? ''}`;
  const [appliedParamsKey, setAppliedParamsKey] = useState('||');
  if (paramsKey !== appliedParamsKey) {
    setAppliedParamsKey(paramsKey);
    if (params.scope && scopes.some((option) => option.value === params.scope)) changeScope(params.scope);
    if (params.status) setStatus(params.status);
    if (params.departmentId) setDepartmentId(params.departmentId);
  }

  const list = useCursorList(
    async (cursor) => {
      const fetchPage = (pageCursor: string | undefined) => {
        const query = {
          cursor: pageCursor,
          limit: PAGE_SIZE,
          status: status === 'ALL' ? undefined : status,
          departmentId: selectedDepartment,
        };
        if (scope === 'team') return ticketApi.department(query);
        if (scope === 'all') return ticketApi.organization(query);
        return ticketApi.mine(query);
      };
      if (!selectedDepartment) return fetchPage(cursor);
      return fetchDepartmentTickets(fetchPage, selectedDepartment, cursor, PAGE_SIZE);
    },
    [scope, status, selectedDepartment],
  );

  useRealtime(['ticket:created', 'ticket:status-update'], () => {
    void list.reload();
  });

  return (
    <Screen
      title="Bills"
      scroll={false}
      right={
        user.departmentId ? (
          <HeaderIconButton icon="add" onPress={() => router.push('/raise-ticket')} accessibilityLabel="Request amount" />
        ) : undefined
      }>
      <View style={styles.filters}>
        {scopes.length > 1 && <Segmented options={scopes} value={scope} onChange={changeScope} />}
        {showDepartmentFilter && (
          <ChipGroup compact options={departmentOptions} value={departmentId} onChange={setDepartmentId} />
        )}
        <ChipGroup compact options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </View>

      {list.isLoading && list.items.length === 0 ? (
        <LoadingState padded />
      ) : list.error && list.items.length === 0 ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(ticket) => ticket.id}
          renderItem={({ item, index }) => <TicketRow ticket={item} index={index} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.isRefreshing} onRefresh={list.refresh} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No tickets here"
              message={status === 'ALL' ? undefined : `No ${STATUS_LABELS[status].toLowerCase()} tickets.`}
            />
          }
          ListFooterComponent={list.isLoadingMore ? <ActivityIndicator style={styles.footer} /> : undefined}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    paddingHorizontal: spacing.four,
    gap: spacing.three,
    paddingBottom: spacing.three,
  },
  list: {
    paddingHorizontal: spacing.four,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  separator: {
    height: spacing.three,
  },
  footer: {
    paddingVertical: spacing.four,
  },
});
