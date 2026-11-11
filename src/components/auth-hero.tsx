import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { type Palette, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';

type AuthHeroProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: React.ReactNode;
  // e.g. { current: 2, total: 3 } for a multi-step flow.
  step?: { current: number; total: number };
};

// Header for the sign-in side flows: an icon badge that springs in, a step
// indicator, and the screen's heading and explanation.
export function AuthHero({ icon, title, description, step }: AuthHeroProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.badge}>
        <View style={styles.badgeInner}>
          <Ionicons name={icon} size={30} color="#FFFFFF" />
        </View>
      </Animated.View>

      {step && (
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.steps}>
          {Array.from({ length: step.total }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.stepDot,
                index < step.current && styles.stepDone,
                index === step.current - 1 && styles.stepCurrent,
              ]}
            />
          ))}
          <Text style={styles.stepLabel}>
            Step {step.current} of {step.total}
          </Text>
        </Animated.View>
      )}

      <Animated.Text entering={FadeInDown.delay(180).duration(450)} style={styles.title}>
        {title}
      </Animated.Text>
      {description ? (
        <Animated.Text entering={FadeInDown.delay(260).duration(450)} style={styles.description}>
          {description}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.three,
    paddingTop: spacing.two,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 28,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: colors.accentTeal,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  badgeInner: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  stepDone: {
    backgroundColor: colors.accentTeal,
  },
  stepCurrent: {
    width: 22,
    backgroundColor: colors.primary,
  },
  stepLabel: {
    ...typography.captionStrong,
    color: colors.textMuted,
    marginLeft: 4,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.callout,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
});
