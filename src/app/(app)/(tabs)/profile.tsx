import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Divider, KeyValue, ListRow, Section } from '@/components/card';
import { Screen } from '@/components/screen';
import { Tag } from '@/components/status-badge';
import { colors, spacing } from '@/constants/theme';
import { useCurrentUser, useSession } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { API_BASE_URL } from '@/lib/config';
import { authApi } from '@/lib/endpoints';
import { humanize, initials, ROLE_LABELS } from '@/lib/format';
import { can } from '@/lib/permissions';

export default function ProfileScreen() {
  const user = useCurrentUser();
  const { signOut, refreshProfile } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const health = useApi(() => authApi.health(), []);

  const changePassword = () => router.push({ pathname: '/forgot-password', params: { email: user.email } });

  const confirmSignOut = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshProfile().catch(() => {}), health.reload()]);
    setIsRefreshing(false);
  };

  return (
    <Screen title="Profile" refreshing={isRefreshing} onRefresh={refresh}>
      <Card style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Tag label={ROLE_LABELS[user.role]} />
        </View>
      </Card>

      {user.mustResetPassword && (
        <Pressable onPress={changePassword} style={styles.banner}>
          <Ionicons name="key-outline" size={20} color="#92400E" />
          <Text style={styles.bannerText}>
            You are using a temporary password. Tap here to set your own.
          </Text>
        </Pressable>
      )}

      <Section title="Account">
        <Card>
          <KeyValue label="Organisation" value={user.companyName ?? '—'} />
          <Divider />
          <KeyValue label="Plan" value={user.plan ? humanize(user.plan) : '—'} />
          {user.designation ? (
            <>
              <Divider />
              <KeyValue label="Designation" value={user.designation} />
            </>
          ) : null}
          {user.phoneNumber ? (
            <>
              <Divider />
              <KeyValue label="Phone" value={user.phoneNumber} />
            </>
          ) : null}
        </Card>
      </Section>

      <Section title="Money">
        <Card style={styles.rows}>
          <ListRow icon="wallet-outline" title="My wallet" subtitle="Approved and paid-out tickets" onPress={() => router.push('/wallet')} />
          {can.viewDepartments(user.role) && (
            <ListRow
              icon="business-outline"
              title="Departments & budgets"
              subtitle="Monthly budgets and spending"
              onPress={() => router.push('/departments')}
            />
          )}
          {can.viewReports(user.role) && (
            <ListRow
              icon="bar-chart-outline"
              title="Reports"
              subtitle="Payouts and daily ticket activity"
              onPress={() => router.push('/reports')}
            />
          )}
          <ListRow icon="pulse-outline" title="Activity log" onPress={() => router.push('/activity')} />
        </Card>
      </Section>

      <Section title="Security">
        <Card style={styles.rows}>
          <ListRow icon="key-outline" title="Change password" onPress={changePassword} />
          <ListRow icon="log-out-outline" title="Log out" destructive onPress={confirmSignOut} />
        </Card>
      </Section>

      <View style={styles.server}>
        <View style={[styles.serverDot, { backgroundColor: health.error ? colors.danger : '#16A34A' }]} />
        <Text style={styles.serverText} numberOfLines={1}>
          {health.error ? 'Server unreachable' : 'Connected'} · {API_BASE_URL}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.four,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  email: {
    fontSize: 13,
    color: colors.textMuted,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.three,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: spacing.four,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  rows: {
    gap: 0,
    paddingVertical: spacing.one,
  },
  server: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.two,
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serverText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
