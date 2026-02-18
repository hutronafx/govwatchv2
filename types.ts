export interface Record {
  id: number;
  ministry: string;
  vendor: string;
  amount: number;
  method: string;
  category: string; // New field for 'Kerja', 'Bekalan', etc.
  date: string;
  title?: string; // Mapped from 'Title'
  tenderNo?: string; // Mapped from 'Tender No.'
  address?: string; // Mapped from 'Address'
  reason?: string | null;
  // OpenTender-like Metadata
  sourceUrl?: string; // Link to the original listing (dataset source)
  contractUrl?: string; // Specific permalink to the contract page
  crawledAt?: string; // ISO Date string of when we fetched this
}

export type ViewState = 'dashboard' | 'ministry_detail' | 'vendor_detail' | 'ministry_list' | 'vendor_list' | 'about';

export interface ViewConfig {
  view: ViewState;
  ministryName?: string;
  vendorName?: string;
}