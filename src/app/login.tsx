import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuroraBackground } from '@/components/aurora-background';
import { GlassSurface } from '@/components/glass';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import { useSession } from '@/context/session';

const VCLOUDMASTER_URL = 'https://www.vcloudmaster.com';

export default function LoginScreen() {
  const styles = useThemedStyles(makeStyles);
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  const handleLogin = async () => {
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      // The root navigator moves to the app once the session is stored.
      await signIn(email.trim(), password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      if (message.toLowerCase().includes('verify your email')) {
        Alert.alert('Verify your email', message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enter code',
            onPress: () => router.push({ pathname: '/verify-email', params: { email: email.trim() } }),
          },
        ]);
        return;
      }
      Alert.alert('Unable to log in', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AuroraBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.logoMark}>
              <Ionicons name="leaf" size={28} color="#FFFFFF" />
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(150).duration(450)} style={styles.title}>
              KashMemo
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(250).duration(450)} style={styles.tagline}>
              Raise. Track. Get Paid.
            </Animated.Text>
          </View>

          <Animated.View entering={FadeInDown.delay(350).duration(500).springify().damping(18)}>
          <GlassSurface style={styles.form}>
            <TextField
              icon="mail-outline"
              placeholder="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextField
              icon="lock-closed-outline"
              placeholder="Password"
              secureTextEntry={!showPassword}
              trailingIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onTrailingIconPress={() => setShowPassword((prev) => !prev)}
              value={password}
              onChangeText={setPassword}
            />

            <Link href="/forgot-password" style={styles.forgotPassword}>
              Forgot password?
            </Link>

            <PrimaryButton
              label={isLoading ? 'Signing in...' : 'Log In'}
              onPress={handleLogin}
              disabled={!canSubmit}
            />

            <Text style={styles.signupRow}>
              <Text style={styles.signupText}>New to KashMemo? </Text>
              <Link href="/signup" style={styles.signupLink}>
                Register your organisation
              </Link>
            </Text>
            <Text style={styles.employeeHint}>
              Employees receive their login details from their organisation by email.
            </Text>
          </GlassSurface>
          </Animated.View>

          <Text style={styles.footer}>
            Powered by{' '}
            <Text
              style={styles.footerLink}
              onPress={() => void WebBrowser.openBrowserAsync(VCLOUDMASTER_URL).catch(() => Linking.openURL(VCLOUDMASTER_URL))}
              accessibilityRole="link"
              accessibilityHint="Opens vcloudmaster.com">
              Vcloudmaster
            </Text>
          </Text>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.six,
    paddingVertical: spacing.eight,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.eight,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.accentTeal,
    shadowColor: colors.accentTeal,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.three,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  tagline: {
    marginTop: 4,
    ...typography.footnote,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.four,
    padding: spacing.five,
    borderRadius: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    color: colors.primary,
    ...typography.footnoteStrong,
  },
  signupRow: {
    textAlign: 'center',
    marginTop: spacing.two,
  },
  signupText: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  signupLink: {
    ...typography.footnoteStrong,
    color: colors.primary,
  },
  employeeHint: {
    textAlign: 'center',
    ...typography.caption,
    color: colors.textMuted,
  },
  footer: {
    textAlign: 'center',
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.four,
  },
  footerLink: {
    fontWeight: '700',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
