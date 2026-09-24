import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { currentMonth, MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { spacing } from '@/constants/theme';
import { useRealtime } from '@/context/session';
import { BudgetCard } from '@/features/dashboard/shared';
import { useApi } from '@/hooks/use-api';
import { departmentApi } from '@/lib/endpoints';
import { formatMoney } from '@/lib/format';

export default function DepartmentsScreen() {
  const [month, setMonth] = useState(currentMonth);

  const statuses = useApi(async () => {
    const { data: departments } = await departmentApi.list();
    return Promise.all(departments.map((department) => departmentApi.budgetStatus(department.id, month).then((r) => r.data)));
  }, [month]);

  useRealtime(['budget:update', 'ticket:status-update'], () => {
    void statuses.reload();
  });

  const list = statuses.data ?? [];
  const allocated = list.reduce((sum, status) => sum + status.totalAllocated, 0);
  const spent = list.reduce((sum, status) => sum + status.spent, 0);

  return (
    <Screen
      title="Departments & budgets"
      backFallback="/profile"
      refreshing={statuses.isRefreshing}
      onRefresh={statuses.refresh}>
      <MonthSwitcher value={month} onChange={setMonth} />

      {statuses.isLoading && !statuses.data ? <LoadingState /> : null}
      {statuses.error && !statuses.data ? <ErrorState message={statuses.error} onRetry={statuses.reload} /> : null}

      {statuses.data && (
        <>
          <StatGrid>
            <StatTile label="Allocated" value={formatMoney(allocated)} icon="pie-chart-outline" tone="highlight" />
            <StatTile label="Spent" value={formatMoney(spent)} icon="trending-up-outline" />
          </StatGrid>
          {list.length === 0 ? (
            <EmptyState
              icon="business-outline"
              title="No departments yet"
              message="Departments are created when you add employees."
            />
          ) : (
            <View style={styles.list}>
              {list.map((status) => (
                <BudgetCard
                  key={status.departmentId.id}
                  status={status}
                  onPress={() =>
                    router.push({
                      pathname: '/department/[id]',
                      params: { id: status.departmentId.id, month: String(month.month), year: String(month.year) },
                    })
                  }
                />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.three,
  },
});
