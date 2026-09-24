import { Stack } from 'expo-router';
import React from 'react';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="raise-ticket" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-employee" options={{ presentation: 'modal' }} />
      <Stack.Screen name="upload-csv" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
