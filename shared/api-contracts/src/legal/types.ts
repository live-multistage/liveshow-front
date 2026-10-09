export type LegalDocumentKind = 'terms' | 'privacy';

export interface LegalDocumentContent {
  pt: string;
  en?: string;
  es?: string;
}

export interface LegalDocumentVersionSummary {
  version: number;
  publishedAt: string;
  changeSummary: string;
}

export interface LegalDocumentVersion extends LegalDocumentVersionSummary {
  document: LegalDocumentKind;
  content: LegalDocumentContent;
}

export interface PublishLegalVersionRequest {
  content: LegalDocumentContent;
  changeSummary: string;
}
