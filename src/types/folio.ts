export interface EHoldingsPackageMeta {
  providerName: string;
  providerId: string;
  packageName: string;
  packageId: string;
  contentType: string;
  holdingsStatus: string;
}

export interface EHoldingsTitleRow {
  id: string;
  titleName: string;
  titleId: string;
  publicationType: string;
  issnPrint?: string;
  issnOnline?: string;
  isbnPrint?: string;
  isbnOnline?: string;
  publisher?: string;
  subjects?: string;
  coverage?: string;
  url?: string;
  // eHoldings / EBSCO KB external reference (e.g. "36-434-797")
  reference?: string;
  authority?: string; // e.g. "ekb-title"
  type?: string; // e.g. "external"
  // User enriched fields
  poLine: string; // PO line number or UUID
  poLineUuid?: string; // Resolved UUID
  agreementUuid: string; // Target agreement UUID
  agreementName?: string; // Target agreement Name
  status: 'pending' | 'validating' | 'ready' | 'processing' | 'success' | 'error' | 'skipped';
  statusMessage?: string;
  agreementLineId?: string; // Resulting entitlement ID
}

export interface FolioConfig {
  okapiBaseUrl: string;
  tenant: string;
  authToken: string;
  tokenParamName?: string;
  matchDomainPattern: string;
  defaultAgreementUuid: string;
  defaultPoLinePrefix: string;
  linkToResource: boolean;
  dryRun: boolean;
}

export interface MockFolioStore {
  agreements: Array<{ id: string; name: string; agreementStatus: string }>;
  poLines: Array<{ id: string; poLineNumber: string; titleOrPackage: string; cost: number }>;
  agreementLines: Array<{
    id: string;
    owner: string;
    type?: string;
    authority?: string;
    reference?: string;
    description?: string;
    poLines?: Array<{ poLineId: string; _delete?: boolean }>;
  }>;
}
