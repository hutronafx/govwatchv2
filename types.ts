export interface Record {
  id: number;
  ministry: string;
  vendor: string;
  amount: number;
  method: string;
  date: string;
  reason?: string | null;
}

export type ViewState = 'dashboard' | 'upload' | 'ministry';

export interface ViewConfig {
  view: ViewState;
  ministryName?: string;
}