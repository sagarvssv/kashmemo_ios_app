import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { GlassSurface } from '@/components/glass';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { radius, spacing, withAlpha } from '@/constants/theme';

const SHIMMER_MS = 1300;

// One placeholder block with a light band sweeping across it. With "Reduce
// motion" on it gently pulses instead of sweeping.
export function Skeleton({
  width = '100%',
  height = 14,
  borderRadius = 7,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const [blockWidth, setBlockWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withRepeat(withTiming(1, { duration: SHIMMER_MS, easing: Easing.inOut(Easing.ease) }), -1, reduceMotion),
    );
  }, [progress, reduceMotion]);

  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -blockWidth + progress.get() * blockWidth * 2 }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: 0.55 + progress.get() * 0.45 }));

  return (
    <Animated.View
      onLayout={(event) => setBlockWidth(event.nativeEvent.layout.width)}
      style={[styles.block, { width, height, borderRadius }, reduceMotion && pulseStyle, style]}>
      {!reduceMotion && blockWidth > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, bandStyle]}>
          <Svg width={blockWidth} height={height}>
            <Defs>
              <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.75} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width={blockWidth} height={height} fill="url(#shimmer)" />
          </Svg>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// Placeholder shaped like a ticket card: purpose + amount, then badge + meta.
export function SkeletonTicketRow() {
  const styles = useThemedStyles(makeStyles);
  return (
    <GlassSurface style={styles.card}>
      <View style={styles.rowBetween}>
        <Skeleton width="58%" height={16} />
        <Skeleton width={72} height={16} />
      </View>
      <View style={styles.rowBetween}>
        <Skeleton width={92} height={22} borderRadius={11} />
        <Skeleton width="34%" height={12} />
      </View>
    </GlassSurface>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stack}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonTicketRow key={index} />
      ))}
    </View>
  );
}

// Placeholder for a detail page: a hero card and a card of label/value rows.
export function SkeletonDetail() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stack}>
      <GlassSurface style={styles.card}>
        <Skeleton width="45%" height={30} borderRadius={8} />
        <Skeleton width="80%" height={16} />
        <Skeleton width={110} height={22} borderRadius={11} />
      </GlassSurface>
      <Skeleton width={120} height={16} />
      <GlassSurface style={styles.card}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.rowBetween}>
            <Skeleton width="30%" height={13} />
            <Skeleton width="40%" height={13} />
          </View>
        ))}
      </GlassSurface>
    </View>
  );
}

// Placeholder for a list of cards with a progress bar (budgets, reports).
export function SkeletonCards({ count = 3 }: { count?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stack}>
      {Array.from({ length: count }).map((_, index) => (
        <GlassSurface key={index} style={styles.card}>
          <Skeleton width="50%" height={16} />
          <Skeleton height={8} borderRadius={4} />
          <View style={styles.rowBetween}>
            <Skeleton width="30%" height={12} />
            <Skeleton width="25%" height={12} />
          </View>
        </GlassSurface>
      ))}
    </View>
  );
}

// Placeholder for a dashboard: stat tiles, a chart card, and a couple of rows.
export function SkeletonDashboard() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stack}>
      <View style={styles.tiles}>
        {Array.from({ length: 4 }).map((_, index) => (
          <GlassSurface key={index} style={styles.tile}>
            <Skeleton width="60%" height={10} />
            <Skeleton width="75%" height={22} borderRadius={8} />
          </GlassSurface>
        ))}
      </View>
      <GlassSurface style={[styles.card, styles.chartCard]}>
        <Skeleton width={128} height={128} borderRadius={64} />
        <View style={styles.legend}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={index} style={styles.rowBetween}>
              <Skeleton width="62%" height={12} />
              <Skeleton width={18} height={12} />
            </View>
          ))}
        </View>
      </GlassSurface>
      <SkeletonTicketRow />
      <SkeletonTicketRow />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  block: {
    backgroundColor: withAlpha(colors.border, 0.09),
    overflow: 'hidden',
  },
  stack: {
    gap: spacing.three,
  },
  card: {
    borderRadius: radius.large,
    padding: spacing.four,
    gap: spacing.three,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.three,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.three,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: radius.large,
    padding: spacing.four,
    gap: spacing.three,
  },
  chartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.four,
  },
  legend: {
    flex: 1,
    gap: spacing.three,
  },
});
