import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/chip-group';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { GlassSurface } from '@/components/glass';
import { FadeInItem, PressableScale } from '@/components/motion';
import { type Palette, useBrand, useThemedStyles } from '@/constants/brand';
import { iconBadge, radius, spacing, statusColors, TAB_BAR_CLEARANCE, typography } from '@/constants/theme';
import { useRealtime, useSession } from '@/context/session';
import { useCursorList } from '@/hooks/use-api';
import { notificationApi } from '@/lib/endpoints';
import { formatRelative, ticketRef } from '@/lib/format';
import type { AppNotification } from '@/lib/types';
import { useMoneyText } from '@/lib/use-money';

type Filter = 'all' | 'unread';

// `accent` names a palette accent (resolved per role); status alerts keep their status color.
const ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; tint?: string; accent?: keyof Palette['accents'] }> = {
  TICKET_RAISED_FOR_APPROVAL: { icon: 'hourglass-outline', tint: statusColors.PENDING.text },
  TICKET_APPROVED: { icon: 'checkmark-circle-outline', tint: statusColors.APPROVED.text },
  TICKET_PARTIALLY_APPROVED: { icon: 'git-pull-request-outline', tint: statusColors.PARTIALLY_APPROVED.text },
  TICKET_REJECTED: { icon: 'close-circle-outline', tint: statusColors.REJECTED.text },
  TICKET_DISBURSED: { icon: 'cash-outline', tint: statusColors.DISBURSED.text },
  BUDGET_ALLOCATED: { icon: 'pie-chart-outline', accent: 'green' },
  NEW_EMPLOYEE_ADDED: { icon: 'person-add-outline', accent: 'violet' },
  DEPARTMENT_CREATED: { icon: 'business-outline', accent: 'blue' },
  BILL_SUBMITTED_FOR_APPROVAL: { icon: 'receipt-outline', tint: statusColors.PENDING.text },
  BILL_APPROVED: { icon: 'checkmark-circle-outline', tint: statusColors.APPROVED.text },
  BILL_REJECTED: { icon: 'close-circle-outline', tint: statusColors.REJECTED.text },
  ADVANCE_SETTLEMENT_REQUESTED: { icon: 'swap-horizontal-outline', tint: statusColors.SETTLEMENT_PENDING.text },
  ADVANCE_SETTLED: { icon: 'checkmark-done-outline', tint: statusColors.SETTLED.text },
};
const DEFAULT_ICON: { icon: keyof typeof Ionicons.glyphMap; tint?: string } = { icon: 'notifications-outline' };

export default function AlertsScreen() {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  const alertTint = (entry: { tint?: string; accent?: keyof Palette['accents'] }) =>
    entry.tint ?? (entry.accent ? brand.accents[entry.accent] : brand.primary);
  const moneyText = useMoneyText();
  const { unreadCount, refreshUnreadCount } = useSession();
  const [filter, setFilter] = useState<Filter>('all');

  const list = useCursorList(
    (cursor) => notificationApi.list({ cursor, limit: 20, unreadOnly: filter === 'unread' || undefined }),
    [filter],
  );

  useRealtime(['notification'], () => {
    void list.reload();
  });

  const markRead = (notification: AppNotification) => {
    list.setItems((items) =>
      filter === 'unread'
        ? items.filter((item) => item.id !== notification.id)
        : items.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
    );
    notificationApi
      .markRead(notification.id)
      .catch(() => {})
      .finally(() => void refreshUnreadCount());
  };

  const open = (notification: AppNotification) => {
    if (!notification.isRead) markRead(notification);
    const ticketId = notification.metadata?.ticketId;
    if (ticketId) router.push({ pathname: '/ticket/[id]', params: { id: ticketId } });
  };

  const markAllRead = async () => {
    list.setItems((items) => (filter === 'unread' ? [] : items.map((item) => ({ ...item, isRead: true }))));
    try {
      await notificationApi.markAllRead();
    } finally {
      await refreshUnreadCount();
    }
  };

  const refresh = async () => {
    await Promise.all([list.refresh(), refreshUnreadCount()]);
  };

  return (
    <Screen
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
      scroll={false}
      right={
        unreadCount > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={[styles.markAll, { color: brand.primary }]}>Mark all read</Text>
          </Pressable>
        ) : undefined
      }>
      <View style={styles.filters}>
        <Segmented
          options={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

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
          refreshControl={<RefreshControl refreshing={list.isRefreshing} onRefresh={refresh} />}
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="No notifications" />}
          ListFooterComponent={list.isLoadingMore ? <ActivityIndicator style={styles.footer} /> : undefined}
          renderItem={({ item, index }) => (
            <FadeInItem index={index}>
            <PressableScale onPress={() => open(item)}>
            <GlassSurface style={[styles.item, !item.isRead && [styles.unread, { borderColor: brand.primary }]]}>
              <View style={[styles.icon, { backgroundColor: iconBadge(alertTint(ICONS[item.type] ?? DEFAULT_ICON)) }]}>
                <Ionicons
                  name={(ICONS[item.type] ?? DEFAULT_ICON).icon}
                  size={17}
                  color={alertTint(ICONS[item.type] ?? DEFAULT_ICON)}
                />
              </View>
              <View style={styles.text}>
                <Text style={[styles.message, !item.isRead && styles.messageUnread]}>{moneyText(item.message)}</Text>
                {item.metadata?.rejectionReason ? (
                  <Text style={styles.detail}>Reason: {item.metadata.rejectionReason}</Text>
                ) : null}
                <Text style={styles.time}>
                  {[ticketRef(item.metadata?.ticketId), formatRelative(item.createdAt)].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {!item.isRead && <View style={[styles.dot, { backgroundColor: brand.primary }]} />}
            </GlassSurface>
            </PressableScale>
            </FadeInItem>
          )}
        />
      )}
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  markAll: {
    ...typography.footnoteStrong,
    color: colors.primary,
  },
  filters: {
    paddingHorizontal: spacing.four,
    paddingBottom: spacing.three,
  },
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
  item: {
    flexDirection: 'row',
    gap: spacing.three,
    borderRadius: radius.medium,
    padding: spacing.three,
  },
  unread: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 4,
  },
  message: {
    ...typography.callout,
    color: colors.textPrimary,
  },
  messageUnread: {
    fontWeight: '600',
  },
  detail: {
    ...typography.footnote,
    color: colors.textMuted,
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
});
