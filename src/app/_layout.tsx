import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

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
  const { user } = useSession();
  const isSignedIn = Boolean(user);

  // No manual navigation here: when a guard flips (sign-in, sign-out, expired
  // session), Stack.Protected redirects to the anchor route (`index`), which
  // then sends the user to /home or /login. Navigating here as well raced with
  // that redirect and caused "ROUTE_NAMES_CHANGED was not handled" errors.

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
      {/* Reachable signed in (Menu) and signed out (signup). */}
      <Stack.Screen name="privacy-policy" options={{ animation: 'slide_from_right' }} />

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
