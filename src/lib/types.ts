// Shapes returned by the KashMemo backend. Prisma serialises Decimal columns as
// strings, so every money field is typed `Money` and read through toAmount().

export type Money = string | number;

export type UserRole = 'CEO' | 'MANAGER' | 'HR' | 'EMPLOYEE' | 'FINANCE_MANAGER';
export type UserStatus = 'PENDING_VERIFICATION' | 'LOADED' | 'ROLE_ASSIGNED' | 'ACTIVE' | 'DISABLED';
// Advances (MANUAL tickets) continue past DISBURSED: the employee spends the
// cash and uploads bills, then finance settles the difference.
export type TicketStatus =
  | 'PENDING'
  | 'PARTIALLY_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED'
  | 'SETTLEMENT_PENDING'
  | 'SETTLED';

export const USER_ROLES: UserRole[] = ['EMPLOYEE', 'MANAGER', 'HR', 'FINANCE_MANAGER', 'CEO'];
export const TICKET_STATUSES: TicketStatus[] = [
  'PENDING',
  'PARTIALLY_APPROVED',
  'APPROVED',
  'REJECTED',
  'DISBURSED',
  'SETTLEMENT_PENDING',
  'SETTLED',
];

export const INDUSTRY_TYPES = [
  'RETAIL',
  'MANUFACTURING',
  'HEALTHCARE',
  'INFORMATION_TECHNOLOGY',
  'REAL_ESTATE',
  'HOSPITALITY',
  'EDUCATION',
  'CONSTRUCTION',
  'LOGISTICS',
  'BANKING_FINANCE',
  'FOOD_BEVERAGE',
  'AUTOMOTIVE',
  'MEDIA_ENTERTAINMENT',
  'ECOMMERCE',
  'TELECOMMUNICATIONS',
  'AGRICULTURE',
  'PHARMACEUTICALS',
  'ENERGY_UTILITIES',
  'PROFESSIONAL_SERVICES',
  'OTHER',
] as const;
export type IndustryType = (typeof INDUSTRY_TYPES)[number];

export type ApiEnvelope<T> = { status?: string; success?: boolean; message?: string; data: T };
export type CursorPage<T> = ApiEnvelope<T[]> & { nextCursor: string | null };

export type SessionUser = {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  companyName?: string;
  plan?: string;
  phoneNumber?: string | null;
  designation?: string | null;
  mustResetPassword?: boolean;
};

export type LoginResult = {
  organizationId: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  plan: string;
  companyName: string;
  department: string | null;
  token: { accessToken: string; refreshToken: string };
};

export type Profile = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  designation: string | null;
  departmentId: string | null;
  role: UserRole;
  status: UserStatus;
  mustResetPassword: boolean;
  createdAt: string;
};

export type DepartmentRef = { id?: string; name: string };

export type Ticket = {
  id: string;
  organizationId: string;
  departmentId: string;
  department?: DepartmentRef;
  raisedBy: string;
  purpose: string;
  amount: Money;
  status: TicketStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  disbursedBy: string | null;
  disbursedAt: string | null;
  managerApprovedBy: string | null;
  managerApprovedAt: string | null;
  ceoApprovedBy: string | null;
  ceoApprovedAt: string | null;
  // MANUAL: raised by hand. RECEIPT: a confirmed scanned bill submitted for
  // approval; the fields below describe that bill.
  source?: TicketSource;
  invoiceId?: string | null;
  vendorName?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  category?: string | null;
  // Advances only: total of approved bills, and how the advance was closed.
  spentAmount?: Money;
  settledBy?: string | null;
  settledAt?: string | null;
  // Signed: +x = employee returned x unspent, -x = finance paid x overspend.
  settlementBalanceAmount?: Money | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketSource = 'MANUAL' | 'RECEIPT';

export type BillStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// A scanned bill the employee added to an advance.
export type TicketBill = {
  id: string;
  ticketId: string;
  invoiceId: string;
  amount: Money;
  currency: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  category: string | null;
  addedBy: string;
  status: BillStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

export type WalletTxnType = 'ADVANCE_CREDIT' | 'BILL_DEBIT' | 'CASH_RETURNED' | 'OVERSPEND_PAID';

// One wallet movement. Signed: + cash went to the employee, - it was accounted for.
export type WalletTransaction = {
  id: string;
  ticketId: string;
  billId: string | null;
  type: WalletTxnType;
  amount: Money;
  createdBy: string;
  createdAt: string;
};

export type Advance = Ticket & {
  bills: TicketBill[];
  walletTransactions: WalletTransaction[];
  // Cash still unaccounted for: + with the employee, - owed to them.
  balance: number;
};

// A bill waiting for review, with the advance it belongs to.
export type PendingBill = TicketBill & {
  ticket: {
    id: string;
    purpose: string;
    amount: Money;
    spentAmount: Money;
    raisedBy: string;
    department: { id: string; name: string };
  };
};

export type MyBill = TicketBill & { ticket: { id: string; purpose: string; status: TicketStatus } };

export type OutstandingAdvance = {
  id: string;
  purpose: string;
  amount: Money;
  spentAmount: Money;
  status: TicketStatus;
  raisedBy: string;
  disbursedAt: string | null;
  department: { id: string; name: string };
  employee: { id: string; name: string; email: string; phoneNumber: string | null; role: UserRole } | null;
  pendingBills: number;
  // Cash the employee hands back, or finance pays them, at settlement.
  toReturn: number;
  toPay: number;
};

export type WalletTicket = {
  id: string;
  purpose: string;
  amount: Money;
  status: TicketStatus;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  department?: DepartmentRef;
};

export type WalletAdvance = {
  id: string;
  purpose: string;
  amount: Money;
  spentAmount: Money;
  status: TicketStatus;
  disbursedAt: string | null;
  department?: DepartmentRef;
  bills: Pick<
    TicketBill,
    'id' | 'invoiceId' | 'amount' | 'status' | 'vendorName' | 'category' | 'invoiceDate' | 'rejectionReason' | 'createdAt'
  >[];
  remaining: number;
  overspent: number;
};

// The wallet is the sum of the user's wallet transactions.
export type Wallet = {
  balance: number;
  cashInHand: number;
  overspent: number;
  openAdvances: WalletAdvance[];
  // Approved but not collected from finance yet - not in the wallet.
  awaitingCollection: (WalletTicket & { source: TicketSource })[];
  transactions: WalletTransaction[];
};

export type RaisedInMonth = {
  month: number;
  year: number;
  count: number;
  totalAmount: number;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  designation?: string | null;
  role: UserRole;
  status?: UserStatus;
  source?: 'MANUAL' | 'CSV';
  createdAt?: string;
  department?: DepartmentRef | null;
};

export type EmployeeDetails = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  designation: string | null;
  role: UserRole;
  department: { id: string; name: string } | null;
  organization: { companyName: string };
};

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

export type Department = { id: string; name: string };

export type ManagerDepartment = Department & {
  organizationId: string;
  isPrimary: boolean;
  createdAt: string;
  // Highest ticket amount the manager can approve alone in this department.
  approvalLimit: number;
  isDefaultLimit: boolean;
};

export type BudgetStatus = {
  departmentId: { id: string; name: string };
  month: number;
  year: number;
  totalAllocated: number;
  spent: number;
  remaining: number;
  hasBudgetSet: boolean;
  // Client-side only: the status call failed, so this row shows the allocation
  // from the organisation budget and spending is unknown.
  spendingUnavailable?: boolean;
};

export type OrgBudget = {
  id: string;
  amount: Money;
  month: number;
  year: number;
  department: Department;
};

export type DashboardSummary = {
  month: number;
  year: number;
  totalEmployees: number;
  totalDepartments: number;
  budget: { totalAllocatedBudget: number; totalSpent: number; totalRemaining: number };
  tickets: Partial<Record<TicketStatus, number>>;
  departments: BudgetStatus[];
  employees: { id: string; name: string; role: UserRole; department: Department | null }[];
};

export type Activity = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  departmentId: string | null;
  actor: { id: string; name: string; email: string };
  metadata: { ticketId?: string; purpose?: string; amount?: Money } | null;
};

export type AppNotification = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata: { ticketId?: string; purpose?: string; amount?: Money; rejectionReason?: string } | null;
};

export type DisbursedSummary = {
  totalDisbursedAmount: number;
  departmentSummary: Record<string, { departmentName: string; totalAmount: number; ticketCount: number }>;
};

export type DailyReportDay = {
  day: string;
  count: Record<TicketStatus, number>;
  amount: Record<TicketStatus, number>;
  totalCount: number;
  totalAmount: number;
};

export type DailyReportTicket = {
  id: string;
  purpose: string;
  amount: Money;
  status: TicketStatus;
  createdAt: string;
  raisedBy: string;
  department: { id: string; name: string };
};

export type DailyReport = {
  // Keyed by day ("YYYY-MM-DD"), then by status.
  groupedByDate: Record<string, Record<TicketStatus, DailyReportTicket[]>>;
  summary: DailyReportDay[];
};

export type CsvUploadResult = { insertedCount: number; employees: Employee[] };
