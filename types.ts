export interface Record {
  id: number;
  ministry: string;
  vendor: string;
  amount: number;
  method: string;
  category: string; // New field for 'Kerja', 'Bekalan', etc.
  date: string;
  reason?: string | null;
  // OpenTender-like Metadata
  sourceUrl?: string; // Link to the original listing
  crawledAt?: string; // ISO Date string of when we fetched this
}

export type ViewState = 'dashboard' | 'upload' | 'ministry_detail' | 'ministry_list' | 'vendor_list' | 'about';

export interface ViewConfig {
  view: ViewState;
  ministryName?: string;
}