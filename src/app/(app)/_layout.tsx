import { Stack } from 'expo-router';
import React from 'react';

import { useBrand } from '@/constants/brand';

export default function AppLayout() {
  const brand = useBrand();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: brand.background },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="raise-ticket" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="add-employee" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="upload-csv" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
