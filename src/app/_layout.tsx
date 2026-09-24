import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';

import { SessionProvider, useSession } from '@/context/session';

function RootNavigator() {
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

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionProvider>
  );
}
