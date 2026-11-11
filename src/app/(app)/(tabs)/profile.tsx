import { router } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { Card, ListRow, Section } from '@/components/card';
import { DisplayCurrencyPicker } from '@/components/display-currency-picker';
import { Screen } from '@/components/screen';
import { useColors } from '@/constants/brand';
import { spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/session';
import { DeleteOrganizationSection } from '@/features/dashboard/delete-organization';
import { can } from '@/lib/permissions';

// The hamburger tab: money and admin shortcuts. Profile details live behind the
// avatar button at the top right of the home screen (/my-profile).
export default function MenuScreen() {
  const colors = useColors();
  const accents = colors.accents;
  const user = useCurrentUser();

  return (
    <Screen title="Menu">
      <Section title="Money">
        <Card style={styles.rows}>
          {can.viewWallet(user.role) && (
            <ListRow
              icon="wallet-outline"
              tint={accents.green}
              title="My wallet"
              subtitle="Approved and paid-out tickets"
              onPress={() => router.push('/wallet')}
            />
          )}
          {can.viewDepartments(user.role) && (
            <ListRow
              icon="business-outline"
              tint={accents.blue}
              title="Departments & budgets"
              subtitle="Monthly budgets and spending"
              onPress={() => router.push('/departments')}
            />
          )}
          {can.manageManagers(user.role) && (
            <ListRow
              icon="git-network-outline"
              tint={accents.violet}
              title="Manager approval limits"
              subtitle="Departments and limits for each manager"
              onPress={() => router.push('/managers')}
            />
          )}
          {can.viewReports(user.role) && (
            <ListRow
              icon="bar-chart-outline"
              tint={accents.orange}
              title="Reports"
              subtitle="Payouts and daily ticket activity"
              onPress={() => router.push('/reports')}
            />
          )}
          {can.viewReceipts(user.role) && (
            <ListRow
              icon="receipt-outline"
              tint={accents.cyan}
              title="My receipts"
              subtitle="Scanned invoices and their status"
              onPress={() => router.push('/receipts')}
            />
          )}
          <ListRow
            icon="pulse-outline"
            tint={accents.teal}
            title={user.role === 'EMPLOYEE' ? 'Your activity' : 'Activity log'}
            onPress={() => router.push('/activity')}
          />
        </Card>
      </Section>

      <Section title="Preferences">
        <Card>
          <DisplayCurrencyPicker />
        </Card>
      </Section>

      {/* CEO only; renders nothing for other roles. */}
      <DeleteOrganizationSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: 0,
    paddingVertical: spacing.one,
  },
});
