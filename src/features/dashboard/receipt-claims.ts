import { statusColors } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { advanceApi, ticketApi } from '@/lib/endpoints';
import type { BillStatus, MyBill, Ticket, TicketStatus } from '@/lib/types';

// A confirmed receipt is claimed one of two ways: as its own RECEIPT ticket that
// goes through approval and payout, or as a bill on an advance whose cash the
// employee already collected. These helpers describe where a claim is.

export const CLAIM_STATUS: Record<TicketStatus, { label: string; background: string; text: string }> = {
  PENDING: { label: 'Waiting for approval', ...statusColors.PENDING },
  PARTIALLY_APPROVED: { label: 'Waiting for approval', ...statusColors.PENDING },
  APPROVED: { label: 'Approved · collect your cash', ...statusColors.APPROVED },
  DISBURSED: { label: 'Paid out', ...statusColors.DISBURSED },
  REJECTED: { label: 'Rejected', ...statusColors.REJECTED },
  // Only advances reach these; listed so every status has a label.
  SETTLEMENT_PENDING: { label: 'Awaiting settlement', ...statusColors.SETTLEMENT_PENDING },
  SETTLED: { label: 'Settled', ...statusColors.SETTLED },
};

export const BILL_STATUS: Record<BillStatus, { label: string; background: string; text: string }> = {
  PENDING: { label: 'Waiting for approval', ...statusColors.PENDING },
  APPROVED: { label: 'Approved', ...statusColors.APPROVED },
  REJECTED: { label: 'Rejected', ...statusColors.REJECTED },
};

export type ReceiptClaim = {
  // The ticket to open: the receipt ticket, or the advance the bill is on.
  ticketId: string;
  label: string;
  background: string;
  text: string;
  rejectionReason: string | null;
  hint: string | null;
};

function ticketClaim(ticket: Ticket): ReceiptClaim {
  return {
    ticketId: ticket.id,
    ...CLAIM_STATUS[ticket.status],
    rejectionReason: ticket.status === 'REJECTED' ? ticket.rejectionReason : null,
    hint: ticket.status === 'APPROVED' ? 'Your bill was approved. Please collect your cash from finance.' : null,
  };
}

function billClaim(bill: MyBill): ReceiptClaim {
  const status = BILL_STATUS[bill.status];
  return {
    ticketId: bill.ticket.id,
    ...status,
    label: bill.status === 'REJECTED' ? status.label : `On advance · ${status.label.toLowerCase()}`,
    rejectionReason: bill.rejectionReason,
    hint: `Added to your advance "${bill.ticket.purpose}".`,
  };
}

// How many of the employee's latest tickets to scan for receipt claims.
const CLAIM_LOOKUP_LIMIT = 100;

// The signed-in employee's receipt claims, keyed by invoiceId. Reloads on focus.
export function useReceiptClaims() {
  return useApi(async () => {
    const [{ data: tickets }, bills] = await Promise.all([
      ticketApi.mine({ limit: CLAIM_LOOKUP_LIMIT }),
      // Older servers have no bills route; their receipts are tickets only.
      advanceApi.myBills().then((r) => r.data).catch(() => [] as MyBill[]),
    ]);
    const byInvoice = new Map<string, ReceiptClaim>();
    for (const ticket of tickets ?? []) {
      if (ticket.source === 'RECEIPT' && ticket.invoiceId) byInvoice.set(ticket.invoiceId, ticketClaim(ticket));
    }
    for (const bill of bills) byInvoice.set(bill.invoiceId, billClaim(bill));
    return byInvoice;
  }, []);
}

// Advances the employee can still add bills to (cash collected, not yet sent
// for settlement), newest first.
export async function loadSpendableAdvances() {
  const { data } = await ticketApi.wallet();
  return data.openAdvances.filter((advance) => advance.status === 'DISBURSED');
}
