import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChipGroup, Segmented } from '@/components/chip-group';
import { Card, Divider, ListRow, Section } from '@/components/card';
import { DateField } from '@/components/date-field';
import { currentMonth, MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { TicketRow } from '@/components/ticket-row';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { chartInk, spacing, statusColors, typography } from '@/constants/theme';
import { useCurrentUser } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { dashboardApi } from '@/lib/endpoints';
import { formatDay, STATUS_LABELS, toIsoDate } from '@/lib/format';
import { can } from '@/lib/permissions';
import { type DailyReportDay, type DailyReportTicket, type TicketStatus } from '@/lib/types';
import { useMoney } from '@/lib/use-money';

type Report = 'payouts' | 'daily';

export default function ReportsScreen() {
  const user = useCurrentUser();
  const { view } = useLocalSearchParams<{ view?: Report }>();
  const reports: { value: Report; label: string }[] = [];
  if (can.viewDisbursedReport(user.role)) reports.push({ value: 'payouts', label: 'Payouts' });
  if (can.viewDailyReport(user.role)) reports.push({ value: 'daily', label: 'Daily tickets' });
  // Home shortcuts open a specific report with ?view=daily.
  const initial = reports.some((option) => option.value === view) ? view! : (reports[0]?.value ?? 'daily');
  const [report, setReport] = useState<Report>(initial);

  return (
    <Screen title="Reports" backFallback="/profile">
      {reports.length > 1 && <Segmented options={reports} value={report} onChange={setReport} />}
      {report === 'payouts' ? <PayoutsReport /> : <DailyReport />}
    </Screen>
  );
}

function PayoutsReport() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const accents = colors.accents;
  const formatMoney = useMoney();
  const [month, setMonth] = useState(currentMonth);
  const summary = useApi(() => dashboardApi.disbursedSummary(month).then((r) => r.data), [month]);
  const tickets = useApi(() => dashboardApi.disbursedTickets(month).then((r) => r.data), [month]);

  const departments = Object.entries(summary.data?.departmentSummary ?? {});
  const ticketCount = departments.reduce((sum, [, department]) => sum + department.ticketCount, 0);

  return (
    <>
      <MonthSwitcher value={month} onChange={setMonth} />
      {summary.isLoading && !summary.data ? <LoadingState variant="cards" /> : null}
      {summary.error && !summary.data ? <ErrorState message={summary.error} onRetry={summary.reload} /> : null}

      {summary.data && (
        <>
          <StatGrid>
            <StatTile
              label="Paid out"
              value={formatMoney(summary.data.totalDisbursedAmount)}
              icon="cash-outline"
              tone="highlight"
            />
            <StatTile label="Tickets paid" value={String(ticketCount)} icon="receipt-outline" tint={accents.indigo} />
          </StatGrid>

          <Section title="By department">
            <Card style={styles.rows}>
              {departments.length === 0 ? (
                <EmptyState icon="cash-outline" title="No payouts this month" />
              ) : (
                departments.map(([departmentId, department]) => (
                  <ListRow
                    key={departmentId}
                    icon="business-outline"
                    title={department.departmentName}
                    subtitle={`${department.ticketCount} ticket${department.ticketCount === 1 ? '' : 's'}`}
                    meta={formatMoney(department.totalAmount)}
                  />
                ))
              )}
            </Card>
          </Section>
        </>
      )}

      {tickets.data && tickets.data.length > 0 && (
        <Section title="Paid tickets">
          <View style={styles.list}>
            {tickets.data.map((ticket, index) => (
              <TicketRow key={ticket.id} ticket={ticket} index={index} />
            ))}
          </View>
        </Section>
      )}
    </>
  );
}

type Range = 'today' | 'week' | 'month' | 'thirty' | 'custom';

// Matches MAX_REPORT_DAYS on the backend (inclusive of both ends).
const MAX_RANGE_DAYS = 92;

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function rangeDates(range: Range, custom: { from: Date; to: Date }): { start: string; end: string } {
  if (range === 'custom') return { start: toIsoDate(custom.from), end: toIsoDate(custom.to) };
  const today = startOfToday();
  const start = new Date(today);
  if (range === 'week') start.setDate(today.getDate() - 6);
  if (range === 'thirty') start.setDate(today.getDate() - 29);
  if (range === 'month') start.setDate(1);
  return { start: toIsoDate(start), end: toIsoDate(today) };
}

function DailyReport() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const accents = colors.accents;
  const formatMoney = useMoney();
  const [range, setRange] = useState<Range>('week');
  const [custom, setCustom] = useState(() => ({ from: addDays(startOfToday(), -6), to: startOfToday() }));
  const { start, end } = rangeDates(range, custom);
  const today = startOfToday();

  // Keep the range valid as either end moves: From <= To, no future days, at most 92 days.
  const changeFrom = (from: Date) => {
    setCustom((current) => {
      const latestTo = addDays(from, MAX_RANGE_DAYS - 1);
      let to = current.to < from ? from : current.to;
      if (to > latestTo) to = latestTo;
      if (to > today) to = today;
      return { from, to };
    });
  };
  const changeTo = (to: Date) => {
    setCustom((current) => {
      const earliestFrom = addDays(to, -(MAX_RANGE_DAYS - 1));
      let from = current.from > to ? to : current.from;
      if (from < earliestFrom) from = earliestFrom;
      return { from, to };
    });
  };
  const report = useApi(() => dashboardApi.dailyReport(start, end).then((r) => r.data), [start, end]);

  const days = [...(report.data?.summary ?? [])].reverse();
  const totalCount = days.reduce((sum, day) => sum + day.totalCount, 0);
  const totalAmount = days.reduce((sum, day) => sum + day.totalAmount, 0);

  return (
    <>
      <ChipGroup
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'Last 7 days' },
          { value: 'month', label: 'This month' },
          { value: 'thirty', label: 'Last 30 days' },
          { value: 'custom', label: 'Custom' },
        ]}
        value={range}
        onChange={setRange}
      />

      {range === 'custom' && (
        <Card>
          <View style={styles.customRow}>
            <DateField label="From" value={custom.from} onChange={changeFrom} maximumDate={today} />
            <DateField
              label="To"
              value={custom.to}
              onChange={changeTo}
              minimumDate={custom.from}
              maximumDate={addDays(custom.from, MAX_RANGE_DAYS - 1) < today ? addDays(custom.from, MAX_RANGE_DAYS - 1) : today}
            />
          </View>
          <Text style={styles.customHint}>Up to {MAX_RANGE_DAYS} days.</Text>
        </Card>
      )}

      {report.isLoading && !report.data ? <LoadingState variant="cards" /> : null}
      {report.error && !report.data ? <ErrorState message={report.error} onRetry={report.reload} /> : null}

      {report.data && (
        <>
          <StatGrid>
            <StatTile label="Tickets raised" value={String(totalCount)} icon="receipt-outline" tone="highlight" />
            <StatTile label="Total requested" value={formatMoney(totalAmount)} icon="cash-outline" tint={accents.green} />
          </StatGrid>

          {days.length === 0 ? (
            <EmptyState icon="calendar-outline" title="No tickets in this period" />
          ) : (
            days.map((day) => (
              <DayCard key={day.day} day={day} tickets={report.data?.groupedByDate?.[day.day]} />
            ))
          )}
        </>
      )}
    </>
  );
}

// Every status the backend groups by - advances move on to settlement after DISBURSED,
// so leaving those out hid their tickets ("No ticket details for this day").
const DAY_ORDER: TicketStatus[] = [
  'PENDING',
  'PARTIALLY_APPROVED',
  'APPROVED',
  'DISBURSED',
  'SETTLEMENT_PENDING',
  'SETTLED',
  'REJECTED',
];

// One day: totals, the status mix as a stacked bar, amounts per status, and the
// day's tickets behind a tap.
function DayCard({
  day,
  tickets,
}: {
  day: DailyReportDay;
  tickets: Record<TicketStatus, DailyReportTicket[]> | undefined;
}) {
  const styles = useThemedStyles(makeStyles);
  const formatMoney = useMoney();
  const [expanded, setExpanded] = useState(false);
  const dayTickets = DAY_ORDER.flatMap((status) => tickets?.[status] ?? []);

  return (
    <Card>
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={styles.dayHeader}>
        <View style={styles.dayHeading}>
          <Text style={styles.dayTitle}>{formatDay(day.day)}</Text>
          <Text style={styles.dayTotal}>
            {day.totalCount} ticket{day.totalCount === 1 ? '' : 's'} · {formatMoney(day.totalAmount)}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={chartInk.muted} />
      </Pressable>

      <View style={styles.dayStack}>
        {DAY_ORDER.filter((status) => day.count[status] > 0).map((status) => (
          <View key={status} style={{ flex: day.count[status], backgroundColor: statusColors[status].series }} />
        ))}
      </View>

      {DAY_ORDER.filter((status) => day.count[status] > 0).map((status) => (
        <View key={status} style={styles.dayRow}>
          <View style={[styles.swatch, { backgroundColor: statusColors[status].series }]} />
          <Text style={styles.dayRowLabel}>
            {STATUS_LABELS[status]} ({day.count[status]})
          </Text>
          <Text style={styles.dayRowValue}>{formatMoney(day.amount[status])}</Text>
        </View>
      ))}

      {expanded && (
        <View style={styles.dayTickets}>
          <Divider />
          {dayTickets.length === 0 ? (
            <Text style={styles.dayTotal}>No ticket details for this day.</Text>
          ) : (
            dayTickets.map((ticket, index) => <TicketRow key={ticket.id} ticket={ticket} index={index} />)
          )}
        </View>
      )}
    </Card>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  customRow: {
    flexDirection: 'row',
    gap: spacing.three,
  },
  customHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  dayHeading: {
    flex: 1,
    gap: 2,
  },
  dayStack: {
    flexDirection: 'row',
    height: 10,
    gap: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  dayRowLabel: {
    flex: 1,
    ...typography.callout,
    color: colors.textPrimary,
  },
  dayRowValue: {
    ...typography.calloutStrong,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  dayTickets: {
    gap: spacing.three,
  },
  list: {
    gap: spacing.three,
  },
  rows: {
    gap: 0,
    paddingVertical: spacing.one,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTitle: {
    ...typography.bodyStrong,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayTotal: {
    ...typography.footnoteStrong,
    color: colors.textMuted,
  },
});
