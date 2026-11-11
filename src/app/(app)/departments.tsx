import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Card } from '@/components/card';
import { currentMonth, MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useColors } from '@/constants/brand';
import { spacing } from '@/constants/theme';
import { useRealtime } from '@/context/session';
import { DepartmentBudgetRow } from '@/features/dashboard/shared';
import { useApi } from '@/hooks/use-api';
import { departmentApi } from '@/lib/endpoints';
import { useMoney } from '@/lib/use-money';

export default function DepartmentsScreen() {
  const colors = useColors();
  const accents = colors.accents;
  const formatMoney = useMoney();
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

      {statuses.isLoading && !statuses.data ? <LoadingState variant="cards" /> : null}
      {statuses.error && !statuses.data ? <ErrorState message={statuses.error} onRetry={statuses.reload} /> : null}

      {statuses.data && (
        <>
          <StatGrid>
            <StatTile label="Allocated" value={formatMoney(allocated)} icon="pie-chart-outline" tone="highlight" />
            <StatTile label="Spent" value={formatMoney(spent)} icon="trending-up-outline" tint={accents.blue} />
          </StatGrid>
          {list.length === 0 ? (
            <EmptyState
              icon="business-outline"
              title="No departments yet"
              message="Departments are created when you add employees."
            />
          ) : (
            <Card style={styles.list}>
              {list.map((status, index) => (
                <DepartmentBudgetRow key={status.departmentId.id} status={status} first={index === 0} month={month} />
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
    paddingVertical: spacing.one,
  },
});
