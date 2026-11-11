import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Card, ListRow } from '@/components/card';
import { FadeInItem } from '@/components/motion';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { spacing, TAB_BAR_CLEARANCE } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useCursorList } from '@/hooks/use-api';
import { dashboardApi } from '@/lib/endpoints';
import { formatDateTime, humanize, ticketRef } from '@/lib/format';
import type { UserRole } from '@/lib/types';
import { useMoneyText } from '@/lib/use-money';

// Matches what /dashboard/recent-activities returns for each role.
const ACTIVITY_SCOPE: Record<UserRole, string> = {
  EMPLOYEE: 'What you did and what happened to your tickets',
  MANAGER: 'Departments you manage',
  CEO: 'Across your organisation',
  HR: 'Across your organisation',
  FINANCE_MANAGER: 'Across your organisation',
};

export default function ActivityScreen() {
  const moneyText = useMoneyText();
  const user = useCurrentUser();
  const list = useCursorList((cursor) => dashboardApi.recentActivity({ cursor, limit: 25 }), []);

  useRealtime(['activity'], () => {
    void list.reload();
  });

  return (
    <Screen
      title={user.role === 'EMPLOYEE' ? 'Your activity' : 'Activity log'}
      subtitle={ACTIVITY_SCOPE[user.role]}
      backFallback="/profile"
      scroll={false}>
      {list.isLoading && list.items.length === 0 ? (
        <LoadingState padded />
      ) : list.error && list.items.length === 0 ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          // Rows embed converted amounts; re-render them when the currency changes.
          extraData={moneyText}
          data={list.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={list.isRefreshing} onRefresh={list.refresh} />}
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="pulse-outline" title="No activity yet" />}
          ListFooterComponent={list.isLoadingMore ? <ActivityIndicator style={styles.footer} /> : undefined}
          renderItem={({ item, index }) => {
            const ticketId = item.metadata?.ticketId;
            return (
              <FadeInItem index={index}>
              <Card style={styles.card}>
                <ListRow
                  icon={ticketId ? 'receipt-outline' : 'pulse-outline'}
                  title={ticketId ? `${humanize(item.type)} · ${ticketRef(ticketId)}` : humanize(item.type)}
                  subtitle={`${moneyText(item.message)}\n${item.actor?.name ?? 'Someone'} · ${formatDateTime(item.createdAt)}`}
                  onPress={
                    ticketId ? () => router.push({ pathname: '/ticket/[id]', params: { id: ticketId } }) : undefined
                  }
                />
              </Card>
              </FadeInItem>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.four,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  separator: {
    height: spacing.two,
  },
  footer: {
    paddingVertical: spacing.four,
  },
  card: {
    paddingVertical: 0,
  },
});
