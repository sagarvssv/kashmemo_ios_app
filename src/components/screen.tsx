import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuroraBackground } from '@/components/aurora-background';
import { GlassSurface } from '@/components/glass';
import { FadeInItem } from '@/components/motion';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, spacing, TAB_BAR_CLEARANCE, typography } from '@/constants/theme';
import { goBackOrReplace } from '@/utils/navigation';

type HeaderProps = {
  title: string;
  subtitle?: string;
  // Shows a back chevron that returns to the previous screen, or this route when there is none.
  backFallback?: string;
  right?: React.ReactNode;
  // Shown before the title, e.g. the user's avatar on a dashboard.
  leading?: React.ReactNode;
  // Rendered under the title in place of `subtitle`, e.g. a role pill.
  meta?: React.ReactNode;
};

export function ScreenHeader({ title, subtitle, backFallback, right, leading, meta }: HeaderProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={styles.header}>
      {backFallback && (
        <Pressable onPress={() => goBackOrReplace(backFallback)} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
      )}
      {leading}
      <View style={styles.headerText}>
        <Text style={[styles.title, backFallback && styles.titleCompact]} numberOfLines={1}>
          {title}
        </Text>
        {meta ??
          (subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null)}
      </View>
      {right}
    </View>
  );
}

// Round, tinted action button for the right side of a screen header.
export function HeaderIconButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.headerButton,
        { backgroundColor: iconBadge(brand.primary) },
        pressed && { opacity: 0.7 },
      ]}>
      <Ionicons name={icon} size={18} color={brand.primary} />
    </Pressable>
  );
}

type ScreenProps = HeaderProps & {
  children: React.ReactNode;
  // Set for screens that render their own FlatList instead of a ScrollView.
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
};

export function Screen({ children, scroll = true, refreshing, onRefresh, footer, ...header }: ScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brand.background }]} edges={['top']}>
      <AuroraBackground />
      <ScreenHeader {...header} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={brand.primary} />
              ) : undefined
            }>
            {/* Each top-level block rises in, one after another. */}
            {React.Children.map(children, (child, index) =>
              child ? (
                <FadeInItem index={index} style={styles.block}>
                  {child}
                </FadeInItem>
              ) : null,
            )}
          </ScrollView>
        ) : (
          <View style={styles.flex}>{children}</View>
        )}
        {footer ? <GlassSurface style={styles.footer}>{footer}</GlassSurface> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.three,
    paddingHorizontal: spacing.four,
    paddingTop: spacing.three,
    paddingBottom: spacing.three,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
  },
  // Detail screens (with a back arrow) use the smaller title.
  titleCompact: {
    ...typography.title,
  },
  subtitle: {
    ...typography.footnote,
    color: colors.textMuted,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: spacing.four,
    paddingBottom: TAB_BAR_CLEARANCE,
    gap: spacing.four,
  },
  // Keeps spacing inside a block that wraps several siblings (a fragment).
  block: {
    gap: spacing.four,
  },
  footer: {
    paddingHorizontal: spacing.four,
    paddingTop: spacing.three,
    paddingBottom: spacing.six,
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
