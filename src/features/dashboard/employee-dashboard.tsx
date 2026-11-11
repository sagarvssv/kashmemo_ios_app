import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChipGroup } from '@/components/chip-group';
import { GlassSurface } from '@/components/glass';
import { Screen } from '@/components/screen';
import { STATUS_ICONS } from '@/components/status-badge';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, radius, spacing, statusColors, typography, withAlpha } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { ApiError } from '@/lib/api';
import { ticketApi } from '@/lib/endpoints';
import { formatDate, formatMonth, initials, ROLE_LABELS, STATUS_LABELS, toAmount } from '@/lib/format';
import type { Ticket, TicketStatus } from '@/lib/types';
import { useMoney } from '@/lib/use-money';

import { greetingTitle, TicketPreviewList } from './shared';

const RECENT_SIZE = 5;
// Paging limits for counting this month's tickets client-side (newest first).
const MONTH_PAGE_SIZE = 50;
const MAX_MONTH_PAGES = 10;
// Pending totals stop here and show "100+".
const PENDING_LIMIT = 100;

type IconName = keyof typeof Ionicons.glyphMap;
type RecentFilter = TicketStatus | 'ALL';
const RECENT_FILTERS: TicketStatus[] = ['PENDING', 'PARTIALLY_APPROVED', 'APPROVED', 'DISBURSED', 'REJECTED'];

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Disbursed card: the payouts in one day, month or year, chosen by the user.
type Period = 'day' | 'month' | 'year';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

function inPeriod(value: string | null | undefined, period: Period, anchor: Date) {
  if (!value) return false;
  const date = new Date(value);
  if (date.getFullYear() !== anchor.getFullYear()) return false;
  if (period === 'year') return true;
  if (date.getMonth() !== anchor.getMonth()) return false;
  return period === 'month' || date.getDate() === anchor.getDate();
}

function shiftPeriod(anchor: Date, period: Period, delta: number) {
  const next = new Date(anchor);
  if (period === 'day') next.setDate(next.getDate() + delta);
  else if (period === 'month') next.setMonth(next.getMonth() + delta, 1);
  else next.setFullYear(next.getFullYear() + delta, 0, 1);
  return next;
}

function periodLabel(anchor: Date, period: Period) {
  if (period === 'year') return String(anchor.getFullYear());
  if (period === 'month') return formatMonth(anchor.getMonth() + 1, anchor.getFullYear());
  return formatDate(anchor.toISOString());
}

// Uses /my-tickets-this-month. Servers without that route (404) fall back to
// paging through my tickets, newest first, until one predates the 1st.
async function countRaisedThisMonth(): Promise<{ count: number; capped: boolean }> {
  const now = new Date();
  try {
    const { data } = await ticketApi.raisedInMonth({ month: now.getMonth() + 1, year: now.getFullYear() });
    return { count: data.count, capped: false };
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }

  const since = startOfMonth().getTime();
  let count = 0;
  let cursor: string | undefined;
  for (let page = 0; page < MAX_MONTH_PAGES; page++) {
    const response = await ticketApi.mine({ cursor, limit: MONTH_PAGE_SIZE });
    const tickets: Ticket[] = response.data ?? [];
    const inMonth = tickets.filter((ticket) => new Date(ticket.createdAt).getTime() >= since);
    count += inMonth.length;
    if (inMonth.length < tickets.length || !response.nextCursor) return { count, capped: false };
    cursor = response.nextCursor;
  }
  return { count, capped: true };
}

// Waiting on someone: fully pending, or approved by one approver of several.
async function loadPending(): Promise<{ count: number; amount: number; capped: boolean }> {
  const [pending, partial] = await Promise.all([
    ticketApi.mine({ status: 'PENDING', limit: PENDING_LIMIT }),
    ticketApi.mine({ status: 'PARTIALLY_APPROVED', limit: PENDING_LIMIT }),
  ]);
  const tickets = [...(pending.data ?? []), ...(partial.data ?? [])];
  return {
    count: tickets.length,
    amount: tickets.reduce((sum, ticket) => sum + toAmount(ticket.amount), 0),
    capped: Boolean(pending.nextCursor || partial.nextCursor),
  };
}

export function EmployeeDashboard() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const formatMoney = useMoney();
  const user = useCurrentUser();
  const [filter, setFilter] = useState<RecentFilter>('ALL');
  const [period, setPeriod] = useState<Period>('month');
  const [anchor, setAnchor] = useState(() => new Date());

  const raised = useApi(() => countRaisedThisMonth(), []);
  const pending = useApi(() => loadPending(), []);
  const wallet = useApi(() => ticketApi.wallet(), []);
  const recent = useApi(
    () => ticketApi.mine({ limit: RECENT_SIZE, status: filter === 'ALL' ? undefined : filter }),
    [filter],
  );

  useRealtime(['ticket:created', 'ticket:status-update'], () => {
    void raised.reload();
    void pending.reload();
    void wallet.reload();
    void recent.reload();
  });

  const refresh = async () => {
    await Promise.all([raised.refresh(), pending.refresh(), wallet.refresh(), recent.refresh()]);
  };

  const placeholder = (state: { error: string | null }) => (state.error ? '—' : '…');
  const walletData = wallet.data?.data;
  // Cash finance handed over (advances and overspend), dated by payout.
  const disbursedTickets = (walletData?.transactions ?? [])
    .filter((txn) => txn.type === 'ADVANCE_CREDIT' || txn.type === 'OVERSPEND_PAID')
    .map((txn) => ({ amount: txn.amount, disbursedAt: txn.createdAt }));
  const totalPaidOut = disbursedTickets.reduce((sum, ticket) => sum + toAmount(ticket.amount), 0);
  const periodTickets = disbursedTickets.filter((ticket) => inPeriod(ticket.disbursedAt, period, anchor));
  const periodAmount = periodTickets.reduce((sum, ticket) => sum + toAmount(ticket.amount), 0);
  // Can't step past the current day / month / year.
  const atLatest = inPeriod(new Date().toISOString(), period, anchor);
  const changePeriod = (next: Period) => {
    setPeriod(next);
    setAnchor(new Date());
  };
  const lastPayout = disbursedTickets
    .map((ticket) => ticket.disbursedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  // Approved, not yet collected from finance.
  const awaitingDeposit = (walletData?.awaitingCollection ?? []).reduce(
    (sum, ticket) => sum + toAmount(ticket.amount),
    0,
  );
  const openAdvances = walletData?.openAdvances.length ?? 0;

  const filterOptions = [
    { value: 'ALL' as const, label: 'All', icon: 'apps-outline' as const },
    ...RECENT_FILTERS.map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
      icon: STATUS_ICONS[status],
      tint: statusColors[status].text,
    })),
  ];

  return (
    <Screen
      title={greetingTitle(user)}
      leading={
        <Pressable
          onPress={() => router.push('/my-profile')}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
          <View style={styles.avatarStatus} />
        </Pressable>
      }
      meta={
        <View style={styles.metaRow}>
          <View style={styles.rolePill}>
            <Ionicons name="briefcase-outline" size={11} color={colors.primary} />
            <Text style={styles.rolePillText} numberOfLines={1}>
              {user.designation || ROLE_LABELS[user.role]}
            </Text>
          </View>
          {user.companyName ? (
            <Text style={styles.company} numberOfLines={1}>
              {user.companyName}
            </Text>
          ) : null}
        </View>
      }
      refreshing={raised.isRefreshing || pending.isRefreshing || wallet.isRefreshing || recent.isRefreshing}
      onRefresh={refresh}>
      {/* Disbursed amount card - hidden for now. To show it again, remove this comment wrapper.
      <View style={styles.disbursed}>
        <View style={styles.disbursedTop}>
          <View style={styles.disbursedIcon}>
            <Ionicons name="cash-outline" size={18} color={colors.onHighlight} />
          </View>
          <Text style={styles.disbursedLabel}>Disbursed amount</Text>
        </View>

        <View style={styles.periodTabs}>
          {PERIODS.map((option) => {
            const selected = option.value === period;
            return (
              <Pressable
                key={option.value}
                onPress={() => changePeriod(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.periodTab, selected && styles.periodTabSelected]}>
                <Text style={[styles.periodTabText, selected && styles.periodTabTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.periodNav}>
          <Pressable
            onPress={() => setAnchor((current) => shiftPeriod(current, period, -1))}
            hitSlop={8}
            accessibilityLabel={`Previous ${period}`}
            style={styles.periodArrow}>
            <Ionicons name="chevron-back" size={16} color={colors.onHighlight} />
          </Pressable>
          <Text style={styles.periodLabel}>{periodLabel(anchor, period)}</Text>
          <Pressable
            onPress={() => setAnchor((current) => shiftPeriod(current, period, 1))}
            disabled={atLatest}
            hitSlop={8}
            accessibilityLabel={`Next ${period}`}
            style={[styles.periodArrow, atLatest && styles.periodArrowDisabled]}>
            <Ionicons name="chevron-forward" size={16} color={colors.onHighlight} />
          </Pressable>
        </View>

        <Text style={styles.disbursedValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {walletData ? formatMoney(periodAmount) : placeholder(wallet)}
        </Text>
        {walletData ? (
          <>
            <Text style={styles.disbursedSub}>
              {periodTickets.length} payout{periodTickets.length === 1 ? '' : 's'} ·{' '}
              {formatMoney(totalPaidOut)} all time
            </Text>
            <View style={styles.depositRow}>
              <Ionicons
                name={awaitingDeposit > 0 ? 'time-outline' : 'checkmark-circle'}
                size={14}
                color={colors.onHighlight}
              />
              <Text style={styles.depositText} numberOfLines={1}>
                {awaitingDeposit > 0
                  ? `Direct deposit processing · ${formatMoney(awaitingDeposit)} approved`
                  : lastPayout
                    ? `Direct deposit complete · last paid ${formatDate(lastPayout)}`
                    : 'No direct deposits yet'}
              </Text>
            </View>
          </>
        ) : null}
      </View>
      */}

      <View style={styles.metrics}>
        <Metric
          icon="receipt-outline"
          tint={colors.accents.blue}
          label="Total tickets raised"
          value={raised.data ? `${raised.data.count}${raised.data.capped ? '+' : ''}` : placeholder(raised)}
          footer={<Text style={styles.metricCaption}>This month</Text>}
        />
        <Metric
          icon="hourglass-outline"
          tint={statusColors.PENDING.text}
          label="Pending amount"
          value={pending.data ? formatMoney(pending.data.amount) : placeholder(pending)}
          footer={
            pending.data ? (
              <View style={[styles.badge, styles.amberBadge]}>
                <View style={[styles.badgeDot, { backgroundColor: statusColors.PENDING.series }]} />
                <Text style={[styles.badgeText, { color: statusColors.PENDING.text }]} numberOfLines={1}>
                  {pending.data.count}
                  {pending.data.capped ? '+' : ''} awaiting approval
                </Text>
              </View>
            ) : null
          }
        />
        <Metric
          icon="wallet-outline"
          tint={statusColors.APPROVED.text}
          label="Wallet · cash in hand"
          value={walletData ? formatMoney(walletData.cashInHand) : placeholder(wallet)}
          onPress={() => router.push('/wallet')}
          footer={
            walletData ? (
              walletData.overspent > 0 ? (
                <View style={[styles.badge, { backgroundColor: statusColors.REJECTED.background }]}>
                  <View style={[styles.badgeDot, { backgroundColor: statusColors.REJECTED.series }]} />
                  <Text style={[styles.badgeText, { color: statusColors.REJECTED.text }]} numberOfLines={1}>
                    Overspent · {formatMoney(walletData.overspent)} owed to you
                  </Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: statusColors.APPROVED.background }]}>
                  <View style={[styles.badgeDot, { backgroundColor: statusColors.APPROVED.series }]} />
                  <Text style={[styles.badgeText, { color: statusColors.APPROVED.text }]} numberOfLines={1}>
                    {awaitingDeposit > 0
                      ? `${formatMoney(awaitingDeposit)} to collect from finance`
                      : `${openAdvances} open advance${openAdvances === 1 ? '' : 's'}`}
                  </Text>
                </View>
              )
            ) : null
          }
        />
      </View>

      {/* Fast Track: the main call to action. The backend needs a department on the raiser. */}
      <View style={styles.fastTrack}>
        <View style={styles.fastTrackHeader}>
          <Ionicons name="flash" size={14} color={colors.highlight} />
          <Text style={styles.fastTrackOverline}>Fast Track</Text>
        </View>
        <Text style={styles.fastTrackTitle}>Need reimbursement?</Text>
        <Text style={styles.fastTrackBody}>Snap your receipt and submit it within 24 hours.</Text>
        {user.departmentId ? (
          <Pressable
            onPress={() => router.push('/raise-ticket')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.fastTrackButton, pressed && styles.pressed]}>
            <Ionicons name="add-circle" size={18} color={colors.onHighlight} />
            <Text style={styles.fastTrackButtonText}>Request Amount</Text>
          </Pressable>
        ) : (
          <Text style={styles.fastTrackBody}>Ask your admin to assign you a department to request an amount.</Text>
        )}
      </View>

      <TicketPreviewList
        title="Recent claims"
        filter={<ChipGroup compact options={filterOptions} value={filter} onChange={setFilter} />}
        tickets={recent.isLoading ? undefined : recent.data?.data}
        loading={recent.isLoading}
        emptyTitle={
          recent.error ??
          (filter === 'ALL' ? "You haven't raised any claims yet" : `No ${STATUS_LABELS[filter].toLowerCase()} claims`)
        }
        onSeeAll={() => router.push({ pathname: '/tickets', params: filter === 'ALL' ? {} : { status: filter } })}
      />
    </Screen>
  );
}

function Metric({
  icon,
  tint,
  label,
  value,
  footer,
  onPress,
}: {
  icon: IconName;
  tint: string;
  label: string;
  value: string;
  footer?: React.ReactNode;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const card = (
    <GlassSurface style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: iconBadge(tint) }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={styles.metricLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      {footer}
    </GlassSurface>
  );
  if (!onPress) return <View style={styles.metric}>{card}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.metric, pressed && styles.pressed]}>
      {card}
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pressed: {
      opacity: 0.75,
    },
    // Header
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.highlight,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primaryDark,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    avatarText: {
      ...typography.headline,
      color: colors.onHighlight,
    },
    // Small "online" dot on the avatar.
    avatarStatus: {
      position: 'absolute',
      right: -1,
      bottom: -1,
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor: '#16A34A',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      marginTop: 4,
    },
    rolePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: iconBadge(colors.primary),
      flexShrink: 1,
    },
    rolePillText: {
      ...typography.captionStrong,
      color: colors.primary,
    },
    company: {
      ...typography.caption,
      color: colors.textMuted,
      flexShrink: 1,
    },
    // Metrics
    // Two per row; an odd last card spans the full width.
    metrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.three,
    },
    metric: {
      flexGrow: 1,
      flexBasis: '45%',
      minWidth: 0,
    },
    metricCard: {
      flexGrow: 1,
      borderRadius: radius.large,
      padding: spacing.three,
      gap: 6,
    },
    metricIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricLabel: {
      ...typography.overline,
      color: colors.textMuted,
    },
    metricValue: {
      ...typography.title,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    metricCaption: {
      ...typography.caption,
      color: colors.textMuted,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      maxWidth: '100%',
    },
    amberBadge: {
      backgroundColor: statusColors.PENDING.background,
    },
    badgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    badgeText: {
      ...typography.captionStrong,
      flexShrink: 1,
    },
    // Disbursed
    disbursed: {
      borderRadius: radius.large,
      padding: spacing.four,
      gap: 6,
      backgroundColor: colors.highlight,
      shadowColor: colors.highlight,
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    disbursedTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
    },
    disbursedIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disbursedLabel: {
      ...typography.overline,
      color: colors.onHighlight,
    },
    periodTabs: {
      flexDirection: 'row',
      marginTop: spacing.two,
      padding: 3,
      borderRadius: radius.medium,
      backgroundColor: 'rgba(255,255,255,0.45)',
    },
    periodTab: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 9,
      alignItems: 'center',
    },
    periodTabSelected: {
      backgroundColor: colors.onHighlight,
    },
    periodTabText: {
      ...typography.footnoteStrong,
      color: colors.onHighlight,
    },
    periodTabTextSelected: {
      color: '#FFFFFF',
    },
    periodNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.one,
    },
    periodArrow: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    periodArrowDisabled: {
      opacity: 0.35,
    },
    periodLabel: {
      ...typography.bodyStrong,
      color: colors.onHighlight,
    },
    disbursedValue: {
      ...typography.largeTitle,
      color: colors.onHighlight,
    },
    disbursedSub: {
      ...typography.footnote,
      color: colors.onHighlight,
      opacity: 0.85,
    },
    depositRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      maxWidth: '100%',
      marginTop: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.55)',
    },
    depositText: {
      ...typography.captionStrong,
      color: colors.onHighlight,
      flexShrink: 1,
    },
    // Fast Track
    fastTrack: {
      borderRadius: radius.large,
      padding: spacing.four,
      gap: 6,
      backgroundColor: colors.primary,
      shadowColor: colors.primaryDark,
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    fastTrackHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    fastTrackOverline: {
      ...typography.overline,
      color: colors.highlight,
    },
    fastTrackTitle: {
      ...typography.headline,
      fontSize: 17,
      color: '#FFFFFF',
    },
    fastTrackBody: {
      ...typography.footnote,
      color: withAlpha('#FFFFFF', 0.85),
    },
    fastTrackButton: {
      marginTop: spacing.two,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.two,
      height: 44,
      borderRadius: radius.medium,
      backgroundColor: colors.highlight,
    },
    fastTrackButtonText: {
      ...typography.button,
      color: colors.onHighlight,
    },
  });
