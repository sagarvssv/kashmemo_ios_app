import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ChipGroup, Segmented } from '@/components/chip-group';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { TicketRow } from '@/components/ticket-row';
import { colors, spacing } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useCursorList } from '@/hooks/use-api';
import { ticketApi } from '@/lib/endpoints';
import { STATUS_LABELS } from '@/lib/format';
import { can } from '@/lib/permissions';
import { TICKET_STATUSES, type TicketStatus, type UserRole } from '@/lib/types';

type Scope = 'mine' | 'team' | 'all';
type StatusFilter = TicketStatus | 'ALL';

const PAGE_SIZE = 15;

function scopesFor(role: UserRole): { value: Scope; label: string }[] {
  const scopes: { value: Scope; label: string }[] = [{ value: 'mine', label: 'My tickets' }];
  if (can.viewDepartmentTickets(role)) scopes.push({ value: 'team', label: 'Department' });
  if (can.viewOrgTickets(role)) scopes.push({ value: 'all', label: 'All tickets' });
  return scopes;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  ...TICKET_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

export default function TicketsScreen() {
  const user = useCurrentUser();
  const params = useLocalSearchParams<{ scope?: Scope; status?: TicketStatus }>();
  const scopes = scopesFor(user.role);
  const defaultScope = scopes.length > 1 ? scopes[1].value : 'mine';

  const [scope, setScope] = useState<Scope>(defaultScope);
  const [status, setStatus] = useState<StatusFilter>('ALL');

  // Dashboard shortcuts deep-link into a scope and status; apply them whenever
  // they change (adjusting state during render rather than in an effect).
  const paramsKey = `${params.scope ?? ''}|${params.status ?? ''}`;
  const [appliedParamsKey, setAppliedParamsKey] = useState('|');
  if (paramsKey !== appliedParamsKey) {
    setAppliedParamsKey(paramsKey);
    if (params.scope && scopes.some((option) => option.value === params.scope)) setScope(params.scope);
    if (params.status) setStatus(params.status);
  }

  const list = useCursorList(
    (cursor) => {
      const query = { cursor, limit: PAGE_SIZE, status: status === 'ALL' ? undefined : status };
      if (scope === 'team') return ticketApi.department(query);
      if (scope === 'all') return ticketApi.organization(query);
      return ticketApi.mine(query);
    },
    [scope, status],
  );

  useRealtime(['ticket:created', 'ticket:status-update'], () => {
    void list.reload();
  });

  return (
    <Screen
      title="Tickets"
      scroll={false}
      right={
        user.departmentId ? (
          <Pressable onPress={() => router.push('/raise-ticket')} hitSlop={8} accessibilityLabel="Raise a ticket">
            <Ionicons name="add-circle" size={30} color={colors.primary} />
          </Pressable>
        ) : undefined
      }>
      <View style={styles.filters}>
        {scopes.length > 1 && <Segmented options={scopes} value={scope} onChange={setScope} />}
        <ChipGroup options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </View>

      {list.isLoading && list.items.length === 0 ? (
        <LoadingState />
      ) : list.error && list.items.length === 0 ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(ticket) => ticket.id}
          renderItem={({ item }) => <TicketRow ticket={item} />}
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
          ListFooterComponent={list.isLoadingMore ? <ActivityIndicator style={styles.footer} /> : null}
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
    paddingBottom: spacing.eight,
  },
  separator: {
    height: spacing.three,
  },
  footer: {
    paddingVertical: spacing.four,
  },
});
