// Shapes returned by the KashMemo backend. Prisma serialises Decimal columns as
// strings, so every money field is typed `Money` and read through toAmount().

export type Money = string | number;

export type UserRole = 'CEO' | 'MANAGER' | 'HR' | 'EMPLOYEE' | 'FINANCE_MANAGER';
export type UserStatus = 'PENDING_VERIFICATION' | 'LOADED' | 'ROLE_ASSIGNED' | 'ACTIVE' | 'DISABLED';
export type TicketStatus = 'PENDING' | 'PARTIALLY_APPROVED' | 'APPROVED' | 'REJECTED' | 'DISBURSED';

export const USER_ROLES: UserRole[] = ['EMPLOYEE', 'MANAGER', 'HR', 'FINANCE_MANAGER', 'CEO'];
export const TICKET_STATUSES: TicketStatus[] = ['PENDING', 'PARTIALLY_APPROVED', 'APPROVED', 'REJECTED', 'DISBURSED'];

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
  createdAt: string;
  updatedAt: string;
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

export type Wallet = {
  totalApproved: number;
  totalDisbursed: number;
  totalAmout: number;
  approvedTickets: WalletTicket[];
  disbursedTickets: WalletTicket[];
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
  department: { name: string } | null;
  organization: { companyName: string };
};

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

export type Department = { id: string; name: string };

export type ManagerDepartment = Department & {
  organizationId: string;
  isPrimary: boolean;
  createdAt: string;
};

export type BudgetStatus = {
  departmentId: { id: string; name: string };
  month: number;
  year: number;
  totalAllocated: number;
  spent: number;
  remaining: number;
  hasBudgetSet: boolean;
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

export type DailyReport = {
  summary: DailyReportDay[];
};

export type CsvUploadResult = { insertedCount: number; employees: Employee[] };
