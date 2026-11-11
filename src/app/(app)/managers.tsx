import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Card, ListRow } from '@/components/card';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { employeeApi } from '@/lib/endpoints';
import { shortId } from '@/lib/format';

// CEO entry point for per-manager departments and approval limits.
export default function ManagersScreen() {
  const styles = useThemedStyles(makeStyles);
  const managers = useApi(() => employeeApi.list({ role: 'MANAGER', limit: 100 }).then((r) => r.data), []);

  return (
    <Screen
      title="Manager approval limits"
      backFallback="/profile"
      refreshing={managers.isRefreshing}
      onRefresh={managers.refresh}>
      <Text style={styles.hint}>
        Choose a manager to set how much they can approve alone in each of their departments.
      </Text>

      {managers.isLoading && !managers.data ? <LoadingState /> : null}
      {managers.error && !managers.data ? <ErrorState message={managers.error} onRetry={managers.reload} /> : null}

      {managers.data && (
        <Card style={styles.rows}>
          {managers.data.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No managers yet"
              message="Give someone the Manager role from their profile in People."
            />
          ) : (
            managers.data.map((manager) => (
              <ListRow
                key={manager.id}
                icon="person-outline"
                title={manager.name}
                subtitle={[manager.department?.name ?? 'No primary department', shortId(manager.id)].join(' · ')}
                onPress={() =>
                  router.push({ pathname: '/manager/[id]', params: { id: manager.id, name: manager.name } })
                }
              />
            ))
          )}
        </Card>
      )}
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  hint: {
    ...typography.callout,
    color: colors.textMuted,
  },
  rows: {
    gap: 0,
    paddingVertical: spacing.one,
  },
});
