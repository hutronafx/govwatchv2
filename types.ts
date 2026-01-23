export interface Record {
  id: number;
  ministry: string;
  vendor: string;
  amount: number;
  method: string;
  category: string; // New field for 'Kerja', 'Bekalan', etc.
  date: string;
  reason?: string | null;
}

export type ViewState = 'dashboard' | 'upload' | 'ministry_detail' | 'ministry_list' | 'vendor_list';

export interface ViewConfig {
  view: ViewState;
  ministryName?: string;
}