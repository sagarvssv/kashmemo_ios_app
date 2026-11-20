import type { TicketSource, TicketStatus, UserRole } from './types';

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
  // Coarse check only; use canHandOverCash() for a specific ticket.
  disburse: (role: UserRole) => ORG_ADMIN_ROLES.includes(role),
  manageManagers: (role: UserRole) => role === 'CEO',
  viewDisbursedReport: (role: UserRole) => role === 'CEO',
  viewDailyReport: (role: UserRole) => role === 'CEO' || role === 'FINANCE_MANAGER',
  viewReports: (role: UserRole) => role === 'CEO' || role === 'FINANCE_MANAGER',
  // Personal payouts view; hidden for the CEO, who approves rather than claims.
  viewWallet: (role: UserRole) => role !== 'CEO',
  // Own scanned receipts; hidden for the CEO for the same reason.
  viewReceipts: (role: UserRole) => role !== 'CEO',
  reviewBills: (role: UserRole) => role === 'MANAGER' || role === 'FINANCE_MANAGER' || role === 'CEO',
  viewOutstandingAdvances: (role: UserRole) => ORG_ADMIN_ROLES.includes(role),
  // Coarse check only; use canSettleAdvance() for a specific advance.
  settleAdvance: (role: UserRole) => role === 'FINANCE_MANAGER' || role === 'CEO',
  deleteOrganization: (role: UserRole) => role === 'CEO',
};

// Same table as getAllowedApproverRoles() in the backend.
export function approverRolesFor(raiserRole: UserRole): UserRole[] {
  if (raiserRole === 'FINANCE_MANAGER') return ['CEO'];
  if (raiserRole === 'MANAGER') return ['FINANCE_MANAGER'];
  return ['MANAGER', 'CEO', 'HR', 'FINANCE_MANAGER'];
}

// Same table as getAllowedSettlerRoles() in the backend:
// a Finance Manager's own advance is settled by the CEO only.
export function settlerRolesFor(raiserRole: UserRole): UserRole[] {
  if (raiserRole === 'FINANCE_MANAGER') return ['CEO'];
  return ['FINANCE_MANAGER', 'CEO'];
}

// Same table as getAllowedHandOverCashRoles() in the backend:
// a Finance Manager's own ticket is paid out by the CEO only.
export function handOverRolesFor(raiserRole: UserRole): UserRole[] {
  if (raiserRole === 'FINANCE_MANAGER') return ['CEO'];
  return ['FINANCE_MANAGER', 'CEO', 'HR'];
}

// Hand over cash (advance) / mark as paid (bill). Nobody pays out their own
// ticket (disburseTicket in the backend).
export function canHandOverCash(params: {
  myRole: UserRole;
  myId: string;
  raisedBy: string;
  raiserRole: UserRole | undefined;
  status: TicketStatus;
}) {
  const { myRole, myId, raisedBy, raiserRole, status } = params;
  if (status !== 'APPROVED' || myId === raisedBy) return false;
  // Until the raiser's role has loaded, don't offer the button.
  if (!raiserRole) return false;
  return handOverRolesFor(raiserRole).includes(myRole);
}

// Who the raiser hands their cash to / gets paid by at settlement.
export function settlerLabelFor(raiserRole: UserRole): string {
  return raiserRole === 'FINANCE_MANAGER' ? 'the CEO' : 'finance';
}

export function canSettleAdvance(params: {
  myRole: UserRole;
  myId: string;
  raisedBy: string;
  raiserRole: UserRole | undefined;
  status: TicketStatus;
}) {
  const { myRole, myId, raisedBy, raiserRole, status } = params;
  if (status !== 'SETTLEMENT_PENDING' || myId === raisedBy) return false;
  // Until the raiser's role has loaded, don't offer the button.
  if (!raiserRole) return false;
  return settlerRolesFor(raiserRole).includes(myRole);
}

const RECEIPT_APPROVER_ROLES: UserRole[] = ['MANAGER', 'FINANCE_MANAGER', 'CEO'];

export function canActOnTicket(params: {
  myRole: UserRole;
  myId: string;
  raisedBy: string;
  raiserRole: UserRole | undefined;
  status: TicketStatus;
  source?: TicketSource;
}) {
  const { myRole, myId, raisedBy, raiserRole, status, source } = params;
  if (myId === raisedBy) return { approve: false, reject: false };
  // Bills (receipt tickets): any one of these approves, with no dual sign-off
  // (approveReceiptTicket in the backend). Rejecting follows the normal table.
  if (source === 'RECEIPT') {
    if (status !== 'PENDING') return { approve: false, reject: false };
    return {
      approve: RECEIPT_APPROVER_ROLES.includes(myRole),
      reject: approverRolesFor(raiserRole ?? 'EMPLOYEE').includes(myRole),
    };
  }
  if (status !== 'PENDING' && status !== 'PARTIALLY_APPROVED') return { approve: false, reject: false };
  const allowed = approverRolesFor(raiserRole ?? 'EMPLOYEE').includes(myRole);
  // HR may reject but the approval service only accepts Manager, CEO and Finance.
  return { approve: allowed && myRole !== 'HR', reject: allowed };
}
