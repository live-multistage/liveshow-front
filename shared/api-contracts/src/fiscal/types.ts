export type FiscalDocumentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'AUTHORIZED'
  | 'REJECTED'
  | 'SKIPPED'
  | 'CANCELLING'
  | 'CANCELLED'
  | 'CANCEL_FAILED';

/** GET /orders/:id/fiscal-document — presigned URLs are null unless AUTHORIZED. */
export interface OrderFiscalDocumentView {
  status: FiscalDocumentStatus;
  nfseNumber: string | null;
  authorizedAt: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
}

export interface FiscalDocumentAdminRow {
  id: string;
  orderId: string;
  status: FiscalDocumentStatus;
  amountCents: number;
  currency: string;
  takerName: string;
  takerDocument: string | null;
  nfseNumber: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface FiscalDocumentAdminList {
  items: FiscalDocumentAdminRow[];
  total: number;
  page: number;
  limit: number;
}

export type FiscalTaxRegime = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI';

export interface FiscalIssuerView {
  id: string;
  issuerKind: 'PLATFORM' | 'ORGANIZATION';
  cnpj: string;
  legalName: string;
  municipalRegistration: string | null;
  cityIbgeCode: string;
  serviceCodeNational: string;
  cnae: string | null;
  issRate: number;
  issWithheld: boolean;
  taxRegime: FiscalTaxRegime;
  ibsCbsCst: string | null;
  ibsCbsClassTrib: string | null;
  serviceDescriptionTemplate: string;
  active: boolean;
  updatedAt: string;
}

export type UpdateFiscalIssuerRequest = Partial<
  Omit<FiscalIssuerView, 'id' | 'issuerKind' | 'updatedAt'>
>;
