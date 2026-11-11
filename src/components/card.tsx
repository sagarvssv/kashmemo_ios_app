import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { GlassSurface } from '@/components/glass';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, radius, spacing, typography } from '@/constants/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(makeStyles);
  return <GlassSurface style={[styles.card, style]}>{children}</GlassSurface>;
}

type SectionProps = {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
};

export function Section({ title, action, children }: SectionProps) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={[styles.sectionAction, { color: brand.primary }]}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

type ListRowProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  // Accent for the icon badge; defaults to the primary color.
  tint?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
};

export function ListRow({ title, subtitle, meta, icon, tint, right, onPress, destructive }: ListRowProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const brand = useBrand();
  const accent = destructive ? colors.danger : (tint ?? brand.primary);
  const content = (
    <>
      {icon && (
        <View style={[styles.rowIcon, { backgroundColor: iconBadge(accent) }]}>
          <Ionicons name={icon} size={16} color={accent} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, destructive && { color: colors.danger }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {content}
    </Pressable>
  );
}

export function Divider() {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.divider} />;
}

// A full ID, selectable so it can be long-pressed and copied.
export function IdValue({ id }: { id: string | null | undefined }) {
  const styles = useThemedStyles(makeStyles);
  if (!id) return <Text style={styles.value}>—</Text>;
  return (
    <Text selectable style={styles.idValue}>
      {id}
    </Text>
  );
}

export function KeyValue({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  tint?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  const accent = tint ?? brand.primary;
  return (
    <View style={styles.keyValue}>
      <View style={styles.keyLabel}>
        {icon && (
          <View style={[styles.keyIcon, { backgroundColor: iconBadge(accent) }]}>
            <Ionicons name={icon} size={13} color={accent} />
          </View>
        )}
        <Text style={styles.key}>{label}</Text>
      </View>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={styles.value}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  card: {
    borderRadius: radius.large,
    padding: spacing.four,
    gap: spacing.three,
  },
  section: {
    gap: spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  sectionAction: {
    ...typography.footnoteStrong,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.three,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  rowSubtitle: {
    ...typography.footnote,
    color: colors.textMuted,
  },
  rowMeta: {
    ...typography.calloutStrong,
    color: colors.textPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
  },
  keyValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.three,
  },
  keyLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
    flexShrink: 0,
  },
  keyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  key: {
    ...typography.callout,
    color: colors.textMuted,
  },
  idValue: {
    flexShrink: 1,
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  value: {
    flexShrink: 1,
    ...typography.calloutStrong,
    color: colors.textPrimary,
    textAlign: 'right',
  },
});
