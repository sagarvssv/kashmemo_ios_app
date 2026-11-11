import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ChipGroup } from '@/components/chip-group';
import { GlassSurface } from '@/components/glass';
import { FadeInItem } from '@/components/motion';
import { HeaderIconButton, Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, radius, spacing, statusColors, TAB_BAR_CLEARANCE, typography } from '@/constants/theme';
import { useCurrentUser } from '@/context/session';
import { formatInvoiceAmount, STATUS_STYLE } from '@/features/dashboard/invoice-result';
import { type ReceiptClaim, useReceiptClaims } from '@/features/dashboard/receipt-claims';
import { useCursorList } from '@/hooks/use-api';
import { formatDate } from '@/lib/format';
import { type InvoiceListQuery, type InvoiceSummary, listInvoices } from '@/lib/invoices';

// My receipts: the signed-in user's uploaded invoices (GET /invoices), newest first.

type Filter = 'ALL' | 'REVIEW' | 'COMPLETED' | 'CONFIRMED' | 'DUPLICATE' | 'FAILED';

const FILTERS: { value: Filter; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; tint?: string }[] =
  [
    { value: 'ALL', label: 'All', icon: 'apps-outline' },
    { value: 'REVIEW', label: 'Needs review', icon: 'warning-outline', tint: statusColors.PENDING.text },
    { value: 'COMPLETED', label: 'Ready to confirm', icon: 'time-outline', tint: statusColors.PARTIALLY_APPROVED.text },
    { value: 'CONFIRMED', label: 'Confirmed', icon: 'checkmark-circle-outline', tint: statusColors.APPROVED.text },
    { value: 'DUPLICATE', label: 'Duplicate', icon: 'copy-outline', tint: statusColors.REJECTED.text },
    { value: 'FAILED', label: 'Failed', icon: 'close-circle-outline', tint: statusColors.REJECTED.text },
  ];

const PAGE_SIZE = 20;

function queryFor(filter: Filter): Partial<InvoiceListQuery> {
  if (filter === 'ALL') return {};
  if (filter === 'REVIEW') return { needsReview: true };
  return { status: filter };
}

export default function ReceiptsScreen() {
  const styles = useThemedStyles(makeStyles);
  const user = useCurrentUser();
  const [filter, setFilter] = useState<Filter>('ALL');

  // The service pages with nextToken; useCursorList calls that the cursor.
  // Where each confirmed receipt is in approval / payout, keyed by invoiceId.
  const claims = useReceiptClaims();
  const list = useCursorList(
    async (cursor) => {
      const page = await listInvoices({
        uploadedBy: user.userId,
        limit: PAGE_SIZE,
        nextToken: cursor,
        ...queryFor(filter),
      });
      return { data: page.items, nextCursor: page.nextToken };
    },
    [user.userId, filter],
  );

  return (
    <Screen
      title="My receipts"
      backFallback="/home"
      scroll={false}
      right={
        <HeaderIconButton
          icon="scan-outline"
          onPress={() => router.push('/home')}
          accessibilityLabel="Scan a receipt"
        />
      }>
      <View style={styles.filters}>
        <ChipGroup compact options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {list.isLoading && list.items.length === 0 ? (
        <LoadingState padded />
      ) : list.error && list.items.length === 0 ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => item.invoiceId}
          extraData={claims.data}
          renderItem={({ item, index }) => (
            <ReceiptRow invoice={item} index={index} claim={claims.data?.get(item.invoiceId)} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefreshing}
              onRefresh={() => {
                void claims.reload();
                void list.refresh();
              }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={filter === 'ALL' ? 'No receipts yet' : 'Nothing here'}
              message={
                filter === 'ALL'
                  ? 'Receipts you scan from the home screen appear here.'
                  : 'No receipts match this filter.'
              }
            />
          }
          ListFooterComponent={list.isLoadingMore ? <ActivityIndicator style={styles.footer} /> : undefined}
        />
      )}
    </Screen>
  );
}

function ReceiptRow({ invoice, index, claim }: { invoice: InvoiceSummary; index: number; claim?: ReceiptClaim }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const status = STATUS_STYLE[invoice.status];
  const meta = [
    invoice.invoiceNumber,
    invoice.invoiceDate ? formatDate(invoice.invoiceDate) : null,
    invoice.uploadedAt ? `Uploaded ${formatDate(invoice.uploadedAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <FadeInItem index={index}>
      <Pressable
        onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: invoice.invoiceId } })}
        accessibilityRole="button"
        style={({ pressed }) => pressed && styles.pressed}>
        <GlassSurface style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.body}>
            <View style={styles.line}>
              <Text style={styles.vendor} numberOfLines={1}>
                {invoice.vendorName || invoice.fileName || 'Receipt'}
              </Text>
              <Text style={styles.amount}>{formatInvoiceAmount(invoice.totalAmount, invoice.currency)}</Text>
            </View>
            {meta ? (
              <Text style={styles.meta} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
            <View style={styles.tags}>
              {/* Once submitted, the claim's progress matters more than the scan status. */}
              {claim ? (
                <View style={[styles.pill, { backgroundColor: claim.background }]}>
                  <Text style={[styles.pillText, { color: claim.text }]}>{claim.label}</Text>
                </View>
              ) : (
                <View style={[styles.pill, { backgroundColor: status.background }]}>
                  <Text style={[styles.pillText, { color: status.text }]}>
                    {invoice.status === 'CONFIRMED' ? 'Confirmed · not submitted' : status.label}
                  </Text>
                </View>
              )}
              {invoice.needsReview ? (
                <View style={[styles.pill, { backgroundColor: statusColors.PENDING.background }]}>
                  <Ionicons name="warning-outline" size={11} color={statusColors.PENDING.text} />
                  <Text style={[styles.pillText, { color: statusColors.PENDING.text }]}>Needs review</Text>
                </View>
              ) : null}
              {invoice.category ? (
                <Text style={styles.category} numberOfLines={1}>
                  {invoice.category}
                </Text>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </GlassSurface>
      </Pressable>
    </FadeInItem>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
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
    pressed: {
      opacity: 0.7,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      borderRadius: radius.medium,
      padding: spacing.three,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: iconBadge(colors.primary),
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
      gap: 4,
    },
    line: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.two,
    },
    vendor: {
      flex: 1,
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    amount: {
      ...typography.bodyStrong,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      color: colors.textMuted,
    },
    tags: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    pillText: {
      ...typography.captionStrong,
    },
    category: {
      ...typography.caption,
      color: colors.textSecondary,
      flexShrink: 1,
    },
  });
