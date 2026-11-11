import { DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';

import { ToastProvider } from '@/components/toast';
import { BrandProvider, GREEN_PALETTE, NAVY_PALETTE, SKY_PALETTE, useColors, VIOLET_PALETTE } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/context/session';
import { restoreDisplayCurrency } from '@/lib/currency';
import type { UserRole } from '@/lib/types';

// Navigation containers default to white; during tab and push transitions that
// white showed through as a flash. Use the app background everywhere.
const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, card: colors.background },
};

function RootNavigator() {
  const colors = useColors();
  const { user, isReady } = useSession();
  const isSignedIn = Boolean(user);

  // Move between the auth and app stacks after the guards above have updated,
  // for sign-in, sign-out and an expired session alike. The splash screen
  // handles the initial launch.
  const wasSignedIn = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isReady) return;
    if (wasSignedIn.current !== null && wasSignedIn.current !== isSignedIn) {
      router.replace(isSignedIn ? '/home' : '/login');
    }
    wasSignedIn.current = isSignedIn;
  }, [isReady, isSignedIn]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="verify-email" />
      </Stack.Protected>

      {/* Password recovery also serves signed-in users who must replace a temporary password. */}
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="reset-password" />

      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

// Role brands: violet for the Finance Manager, sky for employees, navy for
// managers, green for the CEO / HR and the signed-out screens. Sits above the toasts so they match too.
function brandFor(role: UserRole | undefined) {
  if (role === 'FINANCE_MANAGER') return VIOLET_PALETTE;
  if (role === 'EMPLOYEE') return SKY_PALETTE;
  if (role === 'MANAGER') return NAVY_PALETTE;
  return GREEN_PALETTE;
}

function RoleBrand({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  return (
    <BrandProvider brand={brandFor(user?.role)}>{children}</BrandProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void restoreDisplayCurrency();
  }, []);

  return (
    <ThemeProvider value={navigationTheme}>
      <SessionProvider>
        <RoleBrand>
          <ToastProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </ToastProvider>
        </RoleBrand>
      </SessionProvider>
    </ThemeProvider>
  );
}
