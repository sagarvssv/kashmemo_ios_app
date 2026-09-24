import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ChipGroup } from '@/components/chip-group';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Tag } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { colors, radius, spacing } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { errorMessage } from '@/lib/api';
import { employeeApi, managerApi } from '@/lib/endpoints';
import { initials, ROLE_LABELS } from '@/lib/format';
import { can } from '@/lib/permissions';
import { USER_ROLES, type Employee, type UserRole } from '@/lib/types';

export default function PeopleScreen() {
  const user = useCurrentUser();
  const isManager = user.role === 'MANAGER';

  return (
    <Screen
      title="People"
      scroll={false}
      right={
        <View style={styles.headerActions}>
          {can.uploadCsv(user.role) && (
            <Pressable onPress={() => router.push('/upload-csv')} hitSlop={8} accessibilityLabel="Upload CSV">
              <Ionicons name="cloud-upload-outline" size={26} color={colors.primary} />
            </Pressable>
          )}
          {can.addEmployee(user.role) && (
            <Pressable onPress={() => router.push('/add-employee')} hitSlop={8} accessibilityLabel="Add employee">
              <Ionicons name="person-add" size={24} color={colors.primary} />
            </Pressable>
          )}
        </View>
      }>
      {isManager ? <DepartmentPeople managerId={user.userId} /> : <OrganizationPeople />}
    </Screen>
  );
}

function DepartmentPeople({ managerId }: { managerId: string }) {
  const departments = useApi(() => managerApi.departments(managerId), [managerId]);
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  const list = departments.data?.data ?? [];
  const selectedId = departmentId ?? list.find((department) => department.isPrimary)?.id ?? list[0]?.id;

  const employees = useApi(
    () => (selectedId ? employeeApi.inDepartment(selectedId).then((r) => r.data) : Promise.resolve([])),
    [selectedId],
  );

  useRealtime(['employee:created', 'employee:update'], () => {
    void employees.reload();
  });

  if (departments.isLoading && !departments.data) return <LoadingState />;
  if (departments.error && !departments.data) {
    return <ErrorState message={departments.error} onRetry={departments.reload} />;
  }

  return (
    <>
      {list.length > 1 && (
        <View style={styles.filters}>
          <ChipGroup
            options={list.map((department) => ({
              value: department.id,
              label: department.isPrimary ? `${department.name} (primary)` : department.name,
            }))}
            value={selectedId ?? ''}
            onChange={setDepartmentId}
          />
        </View>
      )}
      <PeopleList
        employees={employees.data ?? []}
        isLoading={employees.isLoading}
        error={employees.error}
        onRetry={employees.reload}
        refreshing={employees.isRefreshing}
        onRefresh={employees.refresh}
      />
    </>
  );
}

type RoleFilter = UserRole | 'ALL';
const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'ALL', label: 'Everyone' },
  ...USER_ROLES.filter((role) => role !== 'CEO').map((role) => ({ value: role, label: ROLE_LABELS[role] })),
];
const PAGE_SIZE = 20;

function OrganizationPeople() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // The filter combination whose first page has finished loading.
  const [settledQuery, setSettledQuery] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const query = `${debouncedSearch}|${role}`;
  const isLoading = settledQuery !== query;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    (nextPage: number) =>
      employeeApi.list({
        page: nextPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: role === 'ALL' ? undefined : role,
      }),
    [debouncedSearch, role],
  );

  const applyPage = useCallback((response: Awaited<ReturnType<typeof employeeApi.list>>) => {
    const { page: loadedPage, totalPages: pages, total: count } = response.pagination;
    setEmployees((current) => (loadedPage === 1 ? response.data : [...current, ...response.data]));
    setPage(loadedPage);
    setTotalPages(pages);
    setTotal(count);
    setError(null);
  }, []);

  const loadPage = useCallback(
    async (nextPage: number) => applyPage(await fetchPage(nextPage)),
    [fetchPage, applyPage],
  );

  useEffect(() => {
    let cancelled = false;
    fetchPage(1)
      .then((response) => {
        if (!cancelled) applyPage(response);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setSettledQuery(query);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, applyPage, query]);

  useRealtime(['employee:created', 'employee:update'], () => {
    void loadPage(1).catch(() => {});
  });

  const refresh = async () => {
    setIsRefreshing(true);
    await loadPage(1).catch((err) => setError(errorMessage(err)));
    setIsRefreshing(false);
  };

  const loadMore = async () => {
    if (isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    await loadPage(page + 1).catch((err) => setError(errorMessage(err)));
    setIsLoadingMore(false);
  };

  return (
    <>
      <View style={styles.filters}>
        <TextField
          icon="search-outline"
          placeholder="Search by name or email"
          autoCapitalize="none"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        <ChipGroup options={ROLE_FILTERS} value={role} onChange={setRole} />
        {!isLoading && <Text style={styles.count}>{total} people</Text>}
      </View>
      <PeopleList
        employees={isLoading ? [] : employees}
        isLoading={isLoading}
        error={error}
        onRetry={refresh}
        refreshing={isRefreshing}
        onRefresh={refresh}
        onEndReached={loadMore}
        isLoadingMore={isLoadingMore}
      />
    </>
  );
}

type PeopleListProps = {
  employees: Employee[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached?: () => void;
  isLoadingMore?: boolean;
};

function PeopleList({
  employees,
  isLoading,
  error,
  onRetry,
  refreshing,
  onRefresh,
  onEndReached,
  isLoadingMore,
}: PeopleListProps) {
  if (isLoading && employees.length === 0) return <LoadingState />;
  if (error && employees.length === 0) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <FlatList
      data={employees}
      keyExtractor={(employee) => employee.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={<EmptyState icon="people-outline" title="No people found" />}
      ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footer} /> : null}
      renderItem={({ item }) => <PersonRow employee={item} />}
    />
  );
}

function PersonRow({ employee }: { employee: Employee }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/employee/[id]', params: { id: employee.id } })}
      style={({ pressed }) => [styles.person, pressed && { opacity: 0.7 }]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(employee.name)}</Text>
      </View>
      <View style={styles.personText}>
        <Text style={styles.personName} numberOfLines={1}>
          {employee.name}
        </Text>
        <Text style={styles.personMeta} numberOfLines={1}>
          {[employee.designation, employee.department?.name].filter(Boolean).join(' · ') || employee.email}
        </Text>
      </View>
      <Tag label={ROLE_LABELS[employee.role]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.four,
  },
  filters: {
    paddingHorizontal: spacing.four,
    paddingBottom: spacing.three,
    gap: spacing.three,
  },
  count: {
    fontSize: 12,
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: spacing.four,
    paddingBottom: spacing.eight,
  },
  separator: {
    height: spacing.two,
  },
  footer: {
    paddingVertical: spacing.four,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.three,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  personText: {
    flex: 1,
    gap: 2,
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  personMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
