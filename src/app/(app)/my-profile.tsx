import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Divider, IdValue, KeyValue, ListRow, Section } from '@/components/card';
import { Screen } from '@/components/screen';
import { Tag } from '@/components/status-badge';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import { useCurrentUser, useSession } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { API_BASE_URL } from '@/lib/config';
import { authApi, managerApi } from '@/lib/endpoints';
import { humanize, initials, ROLE_LABELS, shortId } from '@/lib/format';
import { useMoney } from '@/lib/use-money';

export default function MyProfileScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const accents = colors.accents;
  const brand = useBrand();
  const formatMoney = useMoney();
  const user = useCurrentUser();
  const { signOut, refreshProfile } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const health = useApi(() => authApi.health(), []);
  const isManager = user.role === 'MANAGER';
  const myDepartments = useApi(
    () => (isManager ? managerApi.myDepartments().then((r) => r.data) : Promise.resolve([])),
    [isManager],
  );

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
    <Screen title="Profile" backFallback="/home" refreshing={isRefreshing} onRefresh={refresh}>
      <Card style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: brand.secondary }]}>
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
          <KeyValue icon="id-card-outline" label={user.role === 'MANAGER' ? 'Manager ID' : 'Employee ID'} value={<IdValue id={user.userId} />} />
          <Divider />
          <KeyValue icon="finger-print-outline" label="Department ID" value={<IdValue id={user.departmentId} />} />
          <Divider />
          <KeyValue icon="briefcase-outline" label="Organisation" value={user.companyName ?? '—'} />
          <Divider />
          <KeyValue icon="finger-print-outline" label="Organisation ID" value={<IdValue id={user.organizationId} />} />
          <Divider />
          <KeyValue icon="ribbon-outline" label="Plan" value={user.plan ? humanize(user.plan) : '—'} />
          {user.designation ? (
            <>
              <Divider />
              <KeyValue icon="medal-outline" label="Designation" value={user.designation} />
            </>
          ) : null}
          {user.phoneNumber ? (
            <>
              <Divider />
              <KeyValue icon="call-outline" label="Phone" value={user.phoneNumber} />
            </>
          ) : null}
        </Card>
      </Section>

      {isManager && (myDepartments.data?.length ?? 0) > 0 && (
        <Section title="Your approval limits">
          <Card style={styles.rows}>
            {(myDepartments.data ?? []).map((department) => (
              <ListRow
                key={department.id}
                icon={department.isPrimary ? 'star' : 'business-outline'}
                title={department.name}
                subtitle={`${department.isPrimary ? 'Primary · ' : ''}${shortId(department.id)}`}
                meta={formatMoney(department.approvalLimit)}
              />
            ))}
          </Card>
        </Section>
      )}

      <Section title="Security">
        <Card style={styles.rows}>
          <ListRow icon="key-outline" tint={accents.amber} title="Change password" onPress={changePassword} />
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
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
    ...typography.title,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  email: {
    ...typography.footnote,
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
    ...typography.callout,
    color: '#92400E',
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
    ...typography.caption,
    color: colors.textMuted,
  },
});
