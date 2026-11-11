import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { AuroraBackground } from '@/components/aurora-background';
import { GlassSurface } from '@/components/glass';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { radius, spacing, statusColors, typography } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const BADGE = 112;
const STROKE = 6;
const RING_R = (BADGE - STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_R;
// Checkmark drawn inside the badge; its length is what the stroke animates over.
const CHECK_PATH = 'M34 58 L50 73 L80 42';
const CHECK_LENGTH = 70;

// Brand + status colours for the confetti.
function confettiColors(palette: Palette) {
  return [
    palette.primary,
    statusColors.APPROVED.series,
    statusColors.PARTIALLY_APPROVED.series,
    statusColors.PENDING.series,
    statusColors.DISBURSED.series,
    palette.blobs[0],
  ];
}
const CONFETTI_COUNT = 22;

// Deterministic "random" in [0, 1) from an index, so pieces are stable across renders.
function scatter(index: number, salt: number) {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type SuccessCelebrationProps = {
  title: string;
  message?: string;
  // Details shown in the summary card, e.g. amount and reference.
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

// Full-screen success moment: a ring draws itself, fills, a checkmark strokes
// in and confetti bursts out, then the summary and actions rise into view.
// With "Reduce motion" on, it shows the finished check without movement.
export function SuccessCelebration({ title, message, children, actions }: SuccessCelebrationProps) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  const reduceMotion = useReducedMotion();
  const ring = useSharedValue(reduceMotion ? 1 : 0);
  const fill = useSharedValue(reduceMotion ? 1 : 0);
  const check = useSharedValue(reduceMotion ? 1 : 0);
  const burst = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    ring.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    fill.set(withDelay(420, withSpring(1, { damping: 11, stiffness: 180 })));
    check.set(withDelay(620, withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) })));
    burst.set(withDelay(640, withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) })));
  }, [burst, check, fill, reduceMotion, ring]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LENGTH * (1 - ring.get()) }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - check.get()) }));
  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.get(),
    transform: [{ scale: 0.4 + fill.get() * 0.6 }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + Math.sin(Math.min(fill.get(), 1) * Math.PI) * 0.08 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <AuroraBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <View style={styles.badgeWrap}>
            {!reduceMotion &&
              Array.from({ length: CONFETTI_COUNT }).map((_, index) => (
                <ConfettiPiece key={index} index={index} progress={burst} />
              ))}
            <Animated.View style={[styles.badge, badgeStyle]}>
              <Animated.View style={[styles.badgeFill, { backgroundColor: brand.primary, shadowColor: brand.primary }, fillStyle]} />
              <Svg width={BADGE} height={BADGE} style={StyleSheet.absoluteFill}>
                <AnimatedCircle
                  cx={BADGE / 2}
                  cy={BADGE / 2}
                  r={RING_R}
                  stroke={brand.primary}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`}
                  animatedProps={ringProps}
                  rotation={-90}
                  origin={`${BADGE / 2}, ${BADGE / 2}`}
                />
                <AnimatedPath
                  d={CHECK_PATH}
                  stroke="#FFFFFF"
                  strokeWidth={9}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${CHECK_LENGTH} ${CHECK_LENGTH}`}
                  animatedProps={checkProps}
                />
              </Svg>
            </Animated.View>
          </View>

          <Animated.Text entering={FadeInDown.delay(reduceMotion ? 0 : 750).duration(450)} style={styles.title}>
            {title}
          </Animated.Text>
          {message ? (
            <Animated.Text entering={FadeInDown.delay(reduceMotion ? 0 : 850).duration(450)} style={styles.message}>
              {message}
            </Animated.Text>
          ) : null}

          {children ? (
            <Animated.View entering={FadeInDown.delay(reduceMotion ? 0 : 950).duration(500).springify().damping(18)} style={styles.cardWrap}>
              <GlassSurface style={styles.card}>{children}</GlassSurface>
            </Animated.View>
          ) : null}
        </View>

        {actions ? (
          <Animated.View entering={FadeIn.delay(reduceMotion ? 0 : 1100).duration(400)} style={styles.actions}>
            {actions}
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function ConfettiPiece({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const styles = useThemedStyles(makeStyles);
  const palette = confettiColors(useColors());
  const angle = (index / CONFETTI_COUNT) * Math.PI * 2 + scatter(index, 1) * 0.5;
  const distance = 90 + scatter(index, 2) * 90;
  const spin = (scatter(index, 3) - 0.5) * 720;
  const width = 6 + Math.round(scatter(index, 4) * 5);
  const height = scatter(index, 5) > 0.5 ? width : width * 2;
  const color = palette[index % palette.length];

  const style = useAnimatedStyle(() => {
    const t = progress.get();
    return {
      opacity: t === 0 ? 0 : 1 - Math.max(0, t - 0.6) / 0.4,
      transform: [
        { translateX: Math.cos(angle) * distance * t },
        // Burst outward, then drift down a little as if falling.
        { translateY: Math.sin(angle) * distance * t + 60 * t * t },
        { rotate: `${spin * t}deg` },
        { scale: 1 - t * 0.3 },
      ],
    };
  });

  return <Animated.View style={[styles.confetti, { width, height, backgroundColor: color }, style]} />;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: spacing.five,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.three,
  },
  badgeWrap: {
    width: BADGE,
    height: BADGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.four,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFill: {
    position: 'absolute',
    width: BADGE - STROKE * 2,
    height: BADGE - STROKE * 2,
    borderRadius: BADGE,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  confetti: {
    position: 'absolute',
    borderRadius: 2,
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...typography.callout,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  cardWrap: {
    alignSelf: 'stretch',
    marginTop: spacing.three,
  },
  card: {
    borderRadius: radius.large,
    padding: spacing.four,
    gap: spacing.three,
  },
  actions: {
    gap: spacing.three,
    paddingBottom: spacing.four,
  },
});
