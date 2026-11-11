import type { CursorPage, Ticket } from './types';

// Upper bound on pages fetched per load when filtering by department client-side.
const MAX_FILTER_PAGES = 10;

// Not every ticket list endpoint honours departmentId, so filter here too and keep
// paging until `minimum` matches (or the end of the list) are reached.
export async function fetchDepartmentTickets(
  fetchPage: (cursor: string | undefined) => Promise<CursorPage<Ticket>>,
  departmentId: string,
  cursor: string | undefined,
  minimum: number,
): Promise<{ data: Ticket[]; nextCursor: string | null }> {
  const matches: Ticket[] = [];
  let nextCursor: string | null | undefined = cursor;
  for (let pages = 0; pages < MAX_FILTER_PAGES; pages++) {
    const response = await fetchPage(nextCursor ?? undefined);
    matches.push(
      ...(response.data ?? []).filter((ticket) => (ticket.departmentId ?? ticket.department?.id) === departmentId),
    );
    nextCursor = response.nextCursor;
    if (!nextCursor || matches.length >= minimum) break;
  }
  return { data: matches, nextCursor: nextCursor ?? null };
}
