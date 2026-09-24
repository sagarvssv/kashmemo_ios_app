import type { TicketStatus, UserRole } from './types';

// Mirrors the role checks in the backend controllers so the UI only offers
// actions the server will accept. The server remains the source of truth.

const ORG_ADMIN_ROLES: UserRole[] = ['CEO', 'HR', 'FINANCE_MANAGER'];

export const can = {
  viewOrgTickets: (role: UserRole) => ORG_ADMIN_ROLES.includes(role),
  viewDepartmentTickets: (role: UserRole) => role === 'MANAGER',
  viewDashboardSummary: (role: UserRole) => role === 'CEO' || role === 'HR',
  viewPendingTickets: (role: UserRole) => role === 'CEO' || role === 'FINANCE_MANAGER',
  viewPeople: (role: UserRole) => role !== 'EMPLOYEE',
  viewDepartments: (role: UserRole) => ORG_ADMIN_ROLES.includes(role),
  addEmployee: (role: UserRole) => role !== 'EMPLOYEE',
  uploadCsv: (role: UserRole) => ORG_ADMIN_ROLES.includes(role),
  changeRole: (role: UserRole) => role === 'CEO',
  deleteEmployeeOrgWide: (role: UserRole) => role === 'CEO' || role === 'HR',
  manageOwnDepartmentEmployees: (role: UserRole) => role === 'MANAGER',
  allocateBudget: (role: UserRole) => role === 'CEO' || role === 'FINANCE_MANAGER',
  disburse: (role: UserRole) => ORG_ADMIN_ROLES.includes(role),
  manageManagers: (role: UserRole) => role === 'CEO',
  viewDisbursedReport: (role: UserRole) => role === 'CEO',
  viewDailyReport: (role: UserRole) => role === 'CEO' || role === 'FINANCE_MANAGER',
  viewReports: (role: UserRole) => role === 'CEO' || role === 'FINANCE_MANAGER',
};

// Same table as getAllowedApproverRoles() in the backend.
export function approverRolesFor(raiserRole: UserRole): UserRole[] {
  if (raiserRole === 'FINANCE_MANAGER') return ['CEO'];
  if (raiserRole === 'MANAGER') return ['FINANCE_MANAGER'];
  return ['MANAGER', 'CEO', 'HR', 'FINANCE_MANAGER'];
}

export function canActOnTicket(params: {
  myRole: UserRole;
  myId: string;
  raisedBy: string;
  raiserRole: UserRole | undefined;
  status: TicketStatus;
}) {
  const { myRole, myId, raisedBy, raiserRole, status } = params;
  if (myId === raisedBy) return { approve: false, reject: false };
  if (status !== 'PENDING' && status !== 'PARTIALLY_APPROVED') return { approve: false, reject: false };
  const allowed = approverRolesFor(raiserRole ?? 'EMPLOYEE').includes(myRole);
  // HR may reject but the approval service only accepts Manager, CEO and Finance.
  return { approve: allowed && myRole !== 'HR', reject: allowed };
}
