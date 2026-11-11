import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ChipGroup } from '@/components/chip-group';
import { HeaderIconButton, Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Tag } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { GlassSurface } from '@/components/glass';
import { FadeInItem, PressableScale } from '@/components/motion';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { radius, spacing, typography, TAB_BAR_CLEARANCE } from '@/constants/theme';
import { useCurrentUser, useRealtime } from '@/context/session';
import { useApi } from '@/hooks/use-api';
import { errorMessage } from '@/lib/api';
import { departmentVisual } from '@/lib/department-icons';
import { departmentApi, employeeApi, managerApi } from '@/lib/endpoints';
import { initials, ROLE_LABELS, shortId } from '@/lib/format';
import { can } from '@/lib/permissions';
import type { Employee } from '@/lib/types';

export default function PeopleScreen() {
  const styles = useThemedStyles(makeStyles);
  const user = useCurrentUser();
  const isManager = user.role === 'MANAGER';

  return (
    <Screen
      title="People"
      scroll={false}
      right={
        <View style={styles.headerActions}>
          {can.uploadCsv(user.role) && (
            <HeaderIconButton
              icon="cloud-upload-outline"
              onPress={() => router.push('/upload-csv')}
              accessibilityLabel="Upload CSV"
            />
          )}
          {can.addEmployee(user.role) && (
            <HeaderIconButton
              icon="person-add-outline"
              onPress={() => router.push('/add-employee')}
              accessibilityLabel="Add employee"
            />
          )}
        </View>
      }>
      {isManager ? <DepartmentPeople /> : <OrganizationPeople />}
    </Screen>
  );
}

function DepartmentPeople() {
  const palette = useColors();
  const styles = useThemedStyles(makeStyles);
  const departments = useApi(() => managerApi.myDepartments(), []);
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

  if (departments.isLoading && !departments.data) return <LoadingState padded />;
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
              ...departmentVisual(department.name, palette.departmentTints),
            }))}
            compact
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

const ALL_DEPARTMENTS = 'ALL';
const PAGE_SIZE = 20;
// Page size and page cap used when collecting a whole department client-side.
const FILTER_PAGE_SIZE = 100;
const MAX_FILTER_PAGES = 20;

function OrganizationPeople() {
  const palette = useColors();
  const styles = useThemedStyles(makeStyles);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentId, setDepartmentId] = useState(ALL_DEPARTMENTS);
  const departments = useApi(() => departmentApi.list(), []);
  const departmentList = departments.data?.data ?? [];
  const departmentOptions = [
    { value: ALL_DEPARTMENTS, label: 'Everyone', icon: 'grid' as const },
    ...departmentList.map((department) => ({
      value: department.id,
      label: department.name,
      ...departmentVisual(department.name, palette.departmentTints),
    })),
  ];
  const departmentName = departmentList.find((department) => department.id === departmentId)?.name;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // The filter combination whose first page has finished loading.
  const [settledQuery, setSettledQuery] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const query = `${debouncedSearch}|${departmentId}`;
  const isLoading = settledQuery !== query;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    async (nextPage: number) => {
      if (departmentId === ALL_DEPARTMENTS) {
        return employeeApi.list({ page: nextPage, limit: PAGE_SIZE, search: debouncedSearch || undefined });
      }

      // The employee list can't filter by department server-side, so collect the
      // organisation's employees and keep this department's as a single page.
      const matches: Employee[] = [];
      for (let current = 1; current <= MAX_FILTER_PAGES; current++) {
        const response = await employeeApi.list({
          page: current,
          limit: FILTER_PAGE_SIZE,
          search: debouncedSearch || undefined,
          departmentId,
        });
        matches.push(
          ...response.data.filter((employee) =>
            employee.department?.id
              ? employee.department.id === departmentId
              : employee.department?.name === departmentName,
          ),
        );
        if (current >= response.pagination.totalPages) break;
      }
      return {
        data: matches,
        pagination: { page: 1, limit: matches.length, total: matches.length, totalPages: 1 },
      };
    },
    [debouncedSearch, departmentId, departmentName],
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
        <ChipGroup compact options={departmentOptions} value={departmentId} onChange={setDepartmentId} />
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
  const styles = useThemedStyles(makeStyles);
  if (isLoading && employees.length === 0) return <LoadingState padded />;
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
      ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footer} /> : undefined}
      renderItem={({ item, index }) => <PersonRow employee={item} index={index} />}
    />
  );
}

function PersonRow({ employee, index }: { employee: Employee; index: number }) {
  const styles = useThemedStyles(makeStyles);
  const brand = useBrand();
  return (
    <FadeInItem index={index}>
    <PressableScale onPress={() => router.push({ pathname: '/employee/[id]', params: { id: employee.id } })}>
    <GlassSurface style={styles.person}>
      <View style={[styles.avatar, { backgroundColor: brand.secondary }]}>
        <Text style={styles.avatarText}>{initials(employee.name)}</Text>
      </View>
      <View style={styles.personText}>
        <Text style={styles.personName} numberOfLines={1}>
          {employee.name}
        </Text>
        <Text style={styles.personMeta} numberOfLines={1}>
          {[shortId(employee.id), employee.designation, employee.department?.name].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Tag label={ROLE_LABELS[employee.role]} />
    </GlassSurface>
    </PressableScale>
    </FadeInItem>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
  },
  filters: {
    paddingHorizontal: spacing.four,
    paddingBottom: spacing.three,
    gap: spacing.three,
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: spacing.four,
    paddingBottom: TAB_BAR_CLEARANCE,
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
    borderRadius: radius.medium,
    padding: spacing.three,
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
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  personMeta: {
    ...typography.footnote,
    color: colors.textMuted,
  },
});
