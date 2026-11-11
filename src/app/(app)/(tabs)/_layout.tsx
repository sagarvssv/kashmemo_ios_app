import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/glass';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { typography } from '@/constants/theme';
import { useCurrentUser, useSession } from '@/context/session';
import { can } from '@/lib/permissions';

type IconName = keyof typeof Ionicons.glyphMap;

// Tab icon that springs up when its tab becomes active.
function AnimatedTabIcon({
  name,
  focusedName,
  color,
  size,
  focused,
}: {
  name: IconName;
  focusedName: IconName;
  color: ColorValue;
  size: number;
  focused: boolean;
}) {
  const scale = useSharedValue(focused ? 1.12 : 1);
  useEffect(() => {
    scale.set(withSpring(focused ? 1.12 : 1, { damping: 12, stiffness: 260 }));
  }, [focused, scale]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={focused ? focusedName : name} size={size} color={color as string} />
    </Animated.View>
  );
}

function tabIcon(name: IconName, focusedName: IconName) {
  return function TabIcon(props: { color: ColorValue; size: number; focused: boolean }) {
    return <AnimatedTabIcon name={name} focusedName={focusedName} {...props} />;
  };
}

function badgeValue(count: number) {
  if (count <= 0) return undefined;
  return count > 99 ? '99+' : count;
}

export default function TabsLayout() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const user = useCurrentUser();
  const { unreadCount, newBillCount, clearNewBillCount } = useSession();
  const insets = useSafeAreaInsets();
  const brand = useBrand();
  const [billsFocused, setBillsFocused] = useState(false);

  // While the Bills tab is open, new bills are already on screen.
  useEffect(() => {
    if (billsFocused && newBillCount > 0) clearNewBillCount();
  }, [billsFocused, newBillCount, clearNewBillCount]);

  return (
    <Tabs
      // The floating bar handles the home-indicator gap itself.
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: brand.background },
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [styles.bar, { marginBottom: Math.max(insets.bottom, 12) }],
        tabBarItemStyle: styles.item,
        tabBarBackground: () => <GlassSurface style={[StyleSheet.absoluteFill, styles.glass]} intensity={70} />,
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Bills',
          tabBarIcon: tabIcon('receipt-outline', 'receipt'),
          tabBarBadge: badgeValue(newBillCount),
          tabBarBadgeStyle: styles.badge,
        }}
        // Opening the Bills tab marks the new bills as seen.
        listeners={{ focus: () => setBillsFocused(true), blur: () => setBillsFocused(false) }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: tabIcon('scan-outline', 'scan'),
          // Bills are submitted under the user's department.
          href: user.departmentId ? undefined : null,
        }}
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
          tabBarBadge: badgeValue(unreadCount),
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Menu', tabBarIcon: tabIcon('menu-outline', 'menu') }} />
    </Tabs>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    bar: {
      position: 'absolute',
      marginHorizontal: 16,
      height: 66,
      paddingTop: 8,
      paddingBottom: 8,
      borderRadius: 26,
      borderTopWidth: 0,
      backgroundColor: 'transparent',
      elevation: 0,
      shadowColor: colors.primaryDark,
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    glass: {
      borderRadius: 26,
    },
    item: {
      paddingVertical: 2,
    },
    label: {
      ...typography.micro,
    },
    badge: {
      backgroundColor: colors.danger,
      ...typography.micro,
      fontWeight: '700',
    },
  });
