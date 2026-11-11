import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { type Palette, useBrand, useThemedStyles } from '@/constants/brand';
import { chartInk, radius, spacing, statusColors, typography } from '@/constants/theme';
import { STATUS_LABELS } from '@/lib/format';
import type { TicketStatus } from '@/lib/types';

// Workflow order; also the order the status palette was validated in.
const ORDER: TicketStatus[] = ['PENDING', 'PARTIALLY_APPROVED', 'APPROVED', 'DISBURSED', 'REJECTED'];

const SIZE = 156;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Surface gap between neighbouring segments, measured along the ring.
const GAP = 3;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Statuses that count as a decision, in the order they fill the meter.
const DECISION_STATUSES: TicketStatus[] = ['APPROVED', 'DISBURSED', 'REJECTED'];

type StatusBreakdownProps = {
  counts: Partial<Record<TicketStatus, number>>;
  // Opens the ticket list for a status.
  onOpenStatus?: (status: TicketStatus) => void;
};

// Part-to-whole view of a period's tickets: a donut with the total in the
// middle, a direct-labelled legend (tap to highlight a status), and two
// headline indicators. Every value is also written as text, so nothing
// depends on telling the colors apart.
export function StatusBreakdown({ counts, onOpenStatus }: StatusBreakdownProps) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  const [selected, setSelected] = useState<TicketStatus | null>(null);
  const rows = ORDER.map((status) => ({ status, count: counts[status] ?? 0 }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  const settled = (counts.APPROVED ?? 0) + (counts.DISBURSED ?? 0);
  const decided = settled + (counts.REJECTED ?? 0);
  const approvalRate = decided > 0 ? Math.round((settled / decided) * 100) : null;
  const needsAction = (counts.PENDING ?? 0) + (counts.PARTIALLY_APPROVED ?? 0);

  // Sweep the ring in whenever the numbers change.
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const countsKey = rows.map((row) => row.count).join(',');
  useEffect(() => {
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    progress.set(0);
    progress.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [countsKey, reduceMotion, progress]);

  // Each segment starts where the previous ones end (fractions of the ring).
  const segments = rows
    .filter((row) => row.count > 0)
    .reduce<{ status: TicketStatus; count: number; start: number; fraction: number }[]>((list, row) => {
      const previous = list[list.length - 1];
      const start = previous ? previous.start + previous.fraction : 0;
      return [...list, { ...row, start, fraction: row.count / total }];
    }, []);
  const singleSegment = segments.length === 1;

  const focus = selected ? rows.find((row) => row.status === selected) : null;
  const toggle = (status: TicketStatus) => setSelected((current) => (current === status ? null : status));

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View
          style={styles.donut}
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            total === 0
              ? 'No tickets yet'
              : `${total} tickets: ${segments.map((s) => `${STATUS_LABELS[s.status]} ${s.count}`).join(', ')}`
          }>
          <Svg width={SIZE} height={SIZE}>
            <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={chartInk.track}
                strokeWidth={STROKE}
                fill="none"
              />
              {segments.map((segment) => (
                <Segment
                  key={segment.status}
                  color={statusColors[segment.status].series}
                  start={segment.start}
                  fraction={segment.fraction}
                  gap={singleSegment ? 0 : GAP}
                  progress={progress}
                  dimmed={selected !== null && selected !== segment.status}
                />
              ))}
            </G>
          </Svg>
          <View style={styles.center} pointerEvents="none">
            <Text style={styles.centerValue}>{focus ? focus.count : total}</Text>
            <Text style={styles.centerLabel} numberOfLines={2}>
              {focus ? STATUS_LABELS[focus.status] : total === 1 ? 'ticket' : 'tickets'}
            </Text>
            {focus && total > 0 ? (
              <Text style={styles.centerShare}>{Math.round((focus.count / total) * 100)}%</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.legend}>
          {rows.map((row) => {
            const isSelected = selected === row.status;
            const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
            return (
              <Pressable
                key={row.status}
                onPress={() => toggle(row.status)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${STATUS_LABELS[row.status]}: ${row.count}, ${share} percent`}
                style={[styles.legendRow, isSelected && [styles.legendRowSelected, { backgroundColor: brand.background }]]}>
                <View style={[styles.swatch, { backgroundColor: statusColors[row.status].series }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {STATUS_LABELS[row.status]}
                </Text>
                <Text style={styles.legendCount}>{row.count}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {focus && onOpenStatus ? (
        <Pressable onPress={() => onOpenStatus(focus.status)} style={styles.openLink} accessibilityRole="link">
          <Text style={[styles.openLinkText, { color: brand.primary }]}>View {STATUS_LABELS[focus.status].toLowerCase()} tickets</Text>
          <Ionicons name="arrow-forward" size={16} color={brand.primary} />
        </Pressable>
      ) : null}

      <View style={styles.kpis}>
        <View style={[styles.kpi, { backgroundColor: brand.background }]}>
          <View style={styles.kpiHeader}>
            <Ionicons name="checkmark-done-outline" size={16} color={brand.primary} />
            <Text style={styles.kpiLabel}>Approval rate</Text>
          </View>
          {approvalRate !== null ? (
            <Text style={styles.kpiValue}>{approvalRate}%</Text>
          ) : (
            <Text style={styles.kpiValueMuted}>{total > 0 ? 'Awaiting decisions' : 'No tickets yet'}</Text>
          )}
          {/* Decision progress across all tickets: approved, paid and rejected
              segments; the undecided remainder shows as track. */}
          <View
            style={styles.meterTrack}
            accessible
            accessibilityLabel={`${decided} of ${total} tickets decided`}>
            {DECISION_STATUSES.filter((status) => (counts[status] ?? 0) > 0).map((status) => (
              <View
                key={status}
                style={{
                  width: `${((counts[status] ?? 0) / Math.max(total, 1)) * 100}%`,
                  backgroundColor: statusColors[status].series,
                }}
              />
            ))}
          </View>
          <Text style={styles.kpiHint}>
            {total === 0
              ? 'Nothing raised this month'
              : decided === 0
                ? `${total} waiting for approval`
                : `${settled} approved · ${counts.REJECTED ?? 0} rejected · ${total - decided} waiting`}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.kpi, { backgroundColor: brand.background }, pressed && onOpenStatus && styles.kpiPressed]}
          onPress={onOpenStatus ? () => onOpenStatus('PENDING') : undefined}
          disabled={!onOpenStatus}
          accessibilityRole={onOpenStatus ? 'button' : undefined}>
          <View style={styles.kpiHeader}>
            <Ionicons name="hourglass-outline" size={16} color={brand.primary} />
            <Text style={styles.kpiLabel}>Needs action</Text>
          </View>
          <Text style={styles.kpiValue}>{needsAction}</Text>
          <Text style={styles.kpiHint}>
            {needsAction === 0 ? 'All caught up' : `${counts.PENDING ?? 0} pending · ${counts.PARTIALLY_APPROVED ?? 0} partial`}
          </Text>
          {onOpenStatus && needsAction > 0 ? (
            <View style={styles.kpiAction}>
              <Text style={[styles.kpiActionText, { color: brand.primary }]}>Review</Text>
              <Ionicons name="chevron-forward" size={14} color={brand.primary} />
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

function Segment({
  color,
  start,
  fraction,
  gap,
  progress,
  dimmed,
}: {
  color: string;
  start: number;
  fraction: number;
  gap: number;
  progress: SharedValue<number>;
  dimmed: boolean;
}) {
  const animatedProps = useAnimatedProps(() => {
    // How much of this segment the sweep has reached so far.
    const shown = Math.min(Math.max(progress.get() - start, 0), fraction);
    const length = Math.max(shown * CIRCUMFERENCE - gap, 0);
    return {
      strokeDasharray: `${length} ${CIRCUMFERENCE}`,
      strokeDashoffset: -start * CIRCUMFERENCE,
    };
  });

  return (
    <AnimatedCircle
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={RADIUS}
      stroke={color}
      strokeWidth={STROKE}
      fill="none"
      opacity={dimmed ? 0.2 : 1}
      animatedProps={animatedProps}
    />
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    gap: spacing.four,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.four,
  },
  donut: {
    width: SIZE,
    height: SIZE,
  },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: STROKE + 6,
  },
  centerValue: {
    ...typography.display,
    color: colors.textPrimary,
  },
  centerLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  centerShare: {
    marginTop: 2,
    ...typography.captionStrong,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  legend: {
    flex: 1,
    gap: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
    paddingVertical: 7,
    paddingHorizontal: spacing.two,
    borderRadius: radius.small,
  },
  legendRowSelected: {
    backgroundColor: colors.background,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    flex: 1,
    ...typography.footnote,
    color: colors.textPrimary,
  },
  legendCount: {
    ...typography.calloutStrong,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  openLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: -spacing.two,
  },
  openLinkText: {
    ...typography.footnoteStrong,
    color: colors.primary,
  },
  kpis: {
    flexDirection: 'row',
    gap: spacing.three,
  },
  kpi: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.medium,
    padding: spacing.three,
    gap: 6,
  },
  kpiPressed: {
    opacity: 0.7,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kpiLabel: {
    ...typography.captionStrong,
    color: colors.textMuted,
  },
  kpiValue: {
    ...typography.title,
    color: colors.textPrimary,
  },
  kpiHint: {
    ...typography.micro,
    color: colors.textMuted,
  },
  kpiValueMuted: {
    ...typography.bodyStrong,
    fontWeight: '700',
    color: colors.textMuted,
    paddingVertical: 5,
  },
  meterTrack: {
    flexDirection: 'row',
    height: 8,
    gap: 2,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  kpiAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  kpiActionText: {
    ...typography.captionStrong,
    fontWeight: '700',
    color: colors.primary,
  },
});
