import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';

import { colors } from '@/constants/theme';
import { useCurrentUser, useSession } from '@/context/session';
import { can } from '@/lib/permissions';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? focusedName : name} size={size} color={color as string} />;
  };
}

export default function TabsLayout() {
  const user = useCurrentUser();
  const { unreadCount } = useSession();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.borderLight },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen
        name="tickets"
        options={{ title: 'Tickets', tabBarIcon: tabIcon('receipt-outline', 'receipt') }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          tabBarIcon: tabIcon('people-outline', 'people'),
          href: can.viewPeople(user.role) ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: tabIcon('notifications-outline', 'notifications'),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-circle-outline', 'person-circle') }}
      />
    </Tabs>
  );
}
