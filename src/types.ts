export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue'
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientAddress: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  notes: string;
  createdAt: any;
  updatedAt: any;
  ownerId: string;
}

export interface UserSettings {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
}
