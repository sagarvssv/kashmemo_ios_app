import { File, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';

import { INVOICE_API_URL } from './config';

// Client for the petty-cash invoice service. Upload flow:
//   1. startUpload()   POST /invoices/upload-url  -> invoiceId + temporary S3 URL
//   2. uploadFile()    PUT the raw file straight to S3 (never through the API)
//   3. getInvoice()    GET /invoices/{id} until OCR + AI processing finishes
// uploadInvoice() runs all three and reports progress.

export const INVOICE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type InvoiceContentType = (typeof INVOICE_CONTENT_TYPES)[number];

export type InvoiceStatus = 'UPLOAD_PENDING' | 'PROCESSING' | 'COMPLETED' | 'DUPLICATE' | 'FAILED' | 'CONFIRMED';

export const INVOICE_CATEGORIES = [
  'Electronics',
  'Logistics & Courier',
  'Food & Beverages',
  'Office Supplies',
  'Travel & Transport',
  'Repairs & Maintenance',
  'Utilities & Telecom',
  'Accommodation',
  'Miscellaneous',
] as const;
export type InvoiceCategory = (typeof INVOICE_CATEGORIES)[number];

export type InvoiceLineItem = {
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
};

// Fields the OCR/AI step extracts; anything it couldn't find is null.
export type ExtractedInvoice = {
  invoiceNumber: string | null;
  invoiceDate: string | null; // YYYY-MM-DD
  vendorName: string | null;
  vendorTaxId: string | null;
  currency: string | null; // ISO code, e.g. AED
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  paymentMethod: string | null;
  lineItems: InvoiceLineItem[] | null;
  notes: string | null;
};

export type Invoice = {
  invoiceId: string;
  status: InvoiceStatus;
  fileName?: string;
  contentType?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  processedAt?: string;
  // Link to the original file; expires after 5 minutes (fetch the invoice again for a fresh one).
  fileUrl?: string;
  extracted?: ExtractedInvoice;
  category?: InvoiceCategory;
  categoryConfidence?: number;
  categoryReason?: string;
  needsReview?: boolean;
  missingFields?: string[];
  possibleDuplicateOf?: string;
  duplicateOf?: string;
  duplicateReason?: 'SAME_FILE' | 'SAME_VENDOR_AND_INVOICE_NUMBER';
  error?: string;
  confirmedBy?: string;
  confirmedAt?: string;
};

export type UploadStart = {
  invoiceId: string;
  uploadUrl: string;
  method: 'PUT';
  headers: { 'Content-Type': string };
  expiresIn: number;
};

export class InvoiceApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'InvoiceApiError';
  }
}

// A request to the service that hasn't answered by then is treated as failed, so the
// app never waits forever on a bad connection. (The S3 upload itself has no limit.)
const REQUEST_TIMEOUT_MS = 20_000;

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${INVOICE_API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = controller.signal.aborted;
    throw new InvoiceApiError(
      0,
      timedOut
        ? 'The invoice service did not respond. Check your connection and try again.'
        : 'Could not reach the invoice service. Check your connection and try again.',
      err,
    );
  } finally {
    clearTimeout(timer);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (body as { error?: string } | null)?.error ?? `Invoice service error (${response.status})`;
    throw new InvoiceApiError(response.status, message, body);
  }
  return body as T;
}

// Step 1. `uploadedBy` must come from the login session, never from user input.
export function startUpload(input: { fileName: string; contentType: InvoiceContentType; uploadedBy: string }) {
  return call<UploadStart>('/invoices/upload-url', { method: 'POST', body: input });
}

// Step 2. The Content-Type must be exactly the one sent to startUpload(), or S3
// rejects the request with SignatureDoesNotMatch. The URL is valid for 15 minutes.
// On iOS/Android the file is sent as raw bytes by the native uploader: React
// Native's fetch can alter the Content-Type of a Blob body, which breaks the
// signature. The browser's fetch is fine on web.
export async function uploadFile(start: UploadStart, fileUri: string) {
  const contentType = start.headers['Content-Type'];
  let status: number;
  let body: string;
  if (Platform.OS === 'web') {
    const file = await (await fetch(fileUri)).blob();
    const response = await fetch(start.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    status = response.status;
    body = await response.text().catch(() => '');
  } else {
    const result = await new File(fileUri).upload(start.uploadUrl, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      headers: { 'Content-Type': contentType },
    });
    status = result.status;
    body = result.body;
  }
  if (status >= 200 && status < 300) return;

  // S3 explains failures in XML: <Code>SignatureDoesNotMatch</Code> etc.
  const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1];
  const expired = code === 'AccessDenied' || /Request has expired/.test(body);
  throw new InvoiceApiError(
    status,
    expired
      ? 'The upload link expired. Please try again.'
      : `The file could not be uploaded (${code ?? `HTTP ${status}`}). Please try again.`,
    body,
  );
}

// Step 3.
export function getInvoice(invoiceId: string) {
  return call<Invoice>(`/invoices/${encodeURIComponent(invoiceId)}`);
}

// One row of GET /invoices: the key fields flattened, without line items.
export type InvoiceSummary = {
  invoiceId: string;
  status: InvoiceStatus;
  fileName?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  vendorName?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  totalAmount?: number | null;
  currency?: string | null;
  category?: InvoiceCategory | null;
  needsReview?: boolean;
  duplicateOf?: string | null;
  possibleDuplicateOf?: string | null;
};

export type InvoiceListQuery = {
  // One status; without it every status except UPLOAD_PENDING is returned.
  status?: InvoiceStatus;
  uploadedBy?: string;
  // Upload date range, inclusive, YYYY-MM-DD.
  from?: string;
  to?: string;
  category?: InvoiceCategory;
  needsReview?: boolean;
  // 1-100, default 50.
  limit?: number;
  nextToken?: string;
};

// Newest upload first. Pass the response's nextToken to get the next page.
export function listInvoices(query: InvoiceListQuery = {}) {
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
  return call<{ items: InvoiceSummary[]; count: number; nextToken: string | null }>(
    `/invoices${params ? `?${params}` : ''}`,
  );
}

export function isProcessing(status: InvoiceStatus) {
  return status === 'UPLOAD_PENDING' || status === 'PROCESSING';
}

// Small files finish in under 10 seconds, so check early, then every few seconds
// (the service guide allows 3-5 s).
const FIRST_POLL_MS = 2000;
const POLL_INTERVAL_MS = 3000;
// Rarely an invoice gets stuck in PROCESSING; stop and offer a retry after this.
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const CANCELLED_MESSAGE = 'Cancelled';

// Checks the invoice until it is COMPLETED, DUPLICATE or FAILED.
export async function waitForInvoice(invoiceId: string, signal?: { readonly cancelled: boolean }): Promise<Invoice> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let delay = FIRST_POLL_MS;
  while (Date.now() < deadline) {
    await wait(delay);
    delay = POLL_INTERVAL_MS;
    if (signal?.cancelled) throw new InvoiceApiError(0, CANCELLED_MESSAGE, { invoiceId });
    const invoice = await getInvoice(invoiceId);
    if (!isProcessing(invoice.status)) return invoice;
  }
  throw new InvoiceApiError(0, 'Reading the receipt is taking too long. Please retry.', { invoiceId });
}

export type UploadStage = 'starting' | 'uploading' | 'processing';

// The whole flow: get an upload URL, send the file to S3, wait for the extracted details.
export async function uploadInvoice(
  input: { fileUri: string; fileName: string; contentType: InvoiceContentType; uploadedBy: string },
  onStage?: (stage: UploadStage, invoiceId?: string) => void,
  signal?: { readonly cancelled: boolean },
): Promise<Invoice> {
  onStage?.('starting');
  const start = await startUpload({
    fileName: input.fileName,
    contentType: input.contentType,
    uploadedBy: input.uploadedBy,
  });
  onStage?.('uploading', start.invoiceId);
  await uploadFile(start, input.fileUri);
  onStage?.('processing', start.invoiceId);
  return waitForInvoice(start.invoiceId, signal);
}

// Step 4: save corrections and/or confirm. Only COMPLETED and CONFIRMED invoices can
// be edited; send only what changed. `updatedBy` must come from the login session.
export function updateInvoice(
  invoiceId: string,
  input: {
    fields?: Partial<ExtractedInvoice>;
    category?: InvoiceCategory;
    confirm?: boolean;
    updatedBy: string;
  },
) {
  return call<Invoice>(`/invoices/${encodeURIComponent(invoiceId)}`, { method: 'PUT', body: input });
}

// Re-runs the AI category on the invoice's current fields (e.g. after corrections).
// Only for COMPLETED and CONFIRMED invoices; fetch the invoice again for the full object.
export function recategorizeInvoice(invoiceId: string) {
  return call<{
    invoiceId: string;
    category: InvoiceCategory;
    confidence: number;
    reason: string;
    needsReview: boolean;
  }>(`/invoices/${encodeURIComponent(invoiceId)}/categorize`, { method: 'POST' });
}

export function isEditable(status: InvoiceStatus) {
  return status === 'COMPLETED' || status === 'CONFIRMED';
}

export type DuplicateCheck = {
  isDuplicate: boolean;
  duplicateOf: string | null;
  reason: 'SAME_FILE' | 'SAME_VENDOR_AND_INVOICE_NUMBER' | null;
  // Same vendor, date and total: a warning, not a block.
  possibleDuplicateOf: string | null;
};

// Does an invoice with these details already exist? Vendor names are matched
// ignoring case, punctuation and suffixes (LLC, Ltd); invoice numbers ignoring
// spaces and dashes. Needs vendorName or vendorTaxId. Pass excludeInvoiceId when
// checking an invoice that already exists so it doesn't match itself.
export function checkDuplicate(input: {
  vendorName?: string | null;
  vendorTaxId?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  totalAmount?: number | null;
  excludeInvoiceId?: string;
}) {
  const body = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  );
  return call<DuplicateCheck>('/invoices/check-duplicate', { method: 'POST', body });
}

// Retry for FAILED invoices; poll with waitForInvoice() afterwards.
export function reprocessInvoice(invoiceId: string) {
  return call<{ invoiceId: string; status: InvoiceStatus; message: string }>(
    `/invoices/${encodeURIComponent(invoiceId)}/reprocess`,
    { method: 'POST' },
  );
}

// Maps a picked file's MIME type to one the service accepts (null: not supported, e.g. HEIC).
export function toInvoiceContentType(mimeType: string | null | undefined, fileName = ''): InvoiceContentType | null {
  const type = (mimeType ?? '').toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg';
  if (type === 'image/png') return 'image/png';
  if (type === 'application/pdf') return 'application/pdf';
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'pdf') return 'application/pdf';
  return null;
}
