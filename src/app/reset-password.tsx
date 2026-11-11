import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { AuthHero } from '@/components/auth-hero';
import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { InlineError } from '@/components/states';
import { SuccessCelebration } from '@/components/success-celebration';
import { TextField } from '@/components/text-field';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { chartInk, colors, spacing, typography } from '@/constants/theme';
import { useSession } from '@/context/session';
import { errorMessage } from '@/lib/api';
import { authApi } from '@/lib/endpoints';

type Rule = {
  label: string;
  test: (value: string) => boolean;
};

// Same rules the backend enforces in resetPassword().
const RULES: Rule[] = [
  { label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value) => /[a-z]/.test(value) },
  { label: 'One number', test: (value) => /[0-9]/.test(value) },
];

const STRENGTH = [
  { label: 'Too weak', color: colors.danger },
  { label: 'Weak', color: colors.danger },
  { label: 'Fair', color: '#eda100' },
  { label: 'Good', color: '#1baf7a' },
  { label: 'Strong', color: colors.primary },
];

export default function ResetPasswordScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();
  const { user, refreshProfile } = useSession();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const passedCount = RULES.filter((rule) => rule.test(password)).length;
  const rulesPassed = passedCount === RULES.length;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = rulesPassed && passwordsMatch && !isSubmitting;
  const strength = STRENGTH[passedCount];

  const handleReset = async () => {
    if (!canSubmit || !email || !otp) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword(email, otp, password);
      if (user) await refreshProfile().catch(() => {});
      setDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    // Signed-in users (replacing a temporary password) go back to the app.
    return (
      <SuccessCelebration
        title="Password updated"
        message={user ? 'Your new password is set. Use it next time you log in.' : 'You can now log in with your new password.'}
        actions={
          user ? (
            <PrimaryButton label="Back to profile" icon="person-circle-outline" onPress={() => router.replace('/my-profile')} />
          ) : (
            <PrimaryButton label="Log in" icon="log-in-outline" onPress={() => router.replace('/login')} />
          )
        }
      />
    );
  }

  return (
    <Screen title="New password" backFallback="/login">
      <AuthHero
        icon="lock-closed-outline"
        title="Create a new password"
        description="Choose a password you haven't used before. You'll use it to log in from now on."
        step={{ current: 3, total: 3 }}
      />

      <Card>
        <TextField
          label="New password"
          icon="lock-closed-outline"
          placeholder="Enter a new password"
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          trailingIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onTrailingIconPress={() => setShowPassword((prev) => !prev)}
          value={password}
          onChangeText={setPassword}
        />

        {password.length > 0 && (
          <Animated.View entering={FadeIn.duration(250)} style={styles.strength}>
            <View style={styles.strengthTrack}>
              {RULES.map((rule, index) => (
                <View
                  key={rule.label}
                  style={[styles.strengthSegment, index < passedCount && { backgroundColor: strength.color }]}
                />
              ))}
            </View>
            <Text style={styles.strengthLabel}>{strength.label}</Text>
          </Animated.View>
        )}

        <TextField
          label="Confirm password"
          icon="lock-closed-outline"
          placeholder="Re-enter the password"
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {confirmPassword.length > 0 && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.matchRow}>
            <Ionicons
              name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={passwordsMatch ? colors.primary : colors.danger}
            />
            <Text style={[styles.matchLabel, { color: passwordsMatch ? colors.primary : colors.danger }]}>
              {passwordsMatch ? 'Passwords match' : "Passwords don't match"}
            </Text>
          </Animated.View>
        )}

        <View style={styles.rules}>
          {RULES.map((rule) => {
            const passed = rule.test(password);
            return (
              <View key={rule.label} style={styles.ruleRow}>
                {/* Re-keyed so the tick springs in the moment a rule is met. */}
                <Animated.View key={passed ? 'passed' : 'pending'} entering={passed ? ZoomIn.springify().damping(10) : undefined}>
                  <Ionicons
                    name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={passed ? colors.primary : chartInk.muted}
                  />
                </Animated.View>
                <Text style={[styles.ruleLabel, passed && styles.ruleLabelPassed]}>{rule.label}</Text>
              </View>
            );
          })}
        </View>

        <InlineError message={error} />
        <PrimaryButton
          label="Reset password"
          icon="checkmark-done-outline"
          onPress={handleReset}
          disabled={!canSubmit}
          loading={isSubmitting}
        />
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  strength: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.three,
    marginTop: -spacing.one,
  },
  strengthTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: chartInk.track,
  },
  strengthLabel: {
    ...typography.captionStrong,
    color: colors.textMuted,
    minWidth: 60,
    textAlign: 'right',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -spacing.one,
  },
  matchLabel: {
    ...typography.footnoteStrong,
  },
  rules: {
    gap: spacing.two,
    paddingVertical: spacing.one,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
  },
  ruleLabel: {
    ...typography.footnote,
    color: colors.textMuted,
  },
  ruleLabelPassed: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
