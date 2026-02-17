import { Record } from './types';

export const INITIAL_RECORDS: Record[] = [
  {
    id: 1,
    ministry: "Kementerian Pendidikan",
    vendor: "Pustaka Saujana Sdn Bhd",
    amount: 1540000,
    method: "Open Tender",
    category: "Bekalan",
    date: "2023-10-12",
    title: "Bekalan Buku Teks Sekolah Rendah Zon B",
    crawledAt: new Date().toISOString()
  },
  {
    id: 2,
    ministry: "Kementerian Kesihatan",
    vendor: "Pharmaniaga Logistics Sdn Bhd",
    amount: 4500000,
    method: "Direct Negotiation",
    category: "Bekalan",
    date: "2023-09-25",
    title: "Perolehan Ubat-Ubatan Kritikal APPL",
    reason: "Kecemasan dan pembekal tunggal dilantik kerajaan",
    crawledAt: new Date().toISOString()
  },
  {
    id: 3,
    ministry: "Kementerian Kerja Raya",
    vendor: "Pembinaan Jaya Bumi",
    amount: 12500000,
    method: "Open Tender",
    category: "Kerja",
    date: "2023-08-15",
    title: "Naik Taraf Jalan Persekutuan FT050",
    crawledAt: new Date().toISOString()
  },
  {
    id: 4,
    ministry: "Kementerian Pengangkutan",
    vendor: "Global Rail Systems",
    amount: 8500000,
    method: "Direct Negotiation",
    category: "Perkhidmatan",
    date: "2023-11-05",
    title: "Maintenance of Signalling Systems Sector A",
    reason: "Proprietary system compatibility",
    crawledAt: new Date().toISOString()
  },
  {
    id: 5,
    ministry: "Kementerian Pertahanan",
    vendor: "DefTech Systems",
    amount: 25000000,
    method: "Direct Negotiation",
    category: "Bekalan",
    date: "2023-07-20",
    title: "Supply of Specialized Tactical Equipment",
    reason: "Keselamatan Negara",
    crawledAt: new Date().toISOString()
  },
  {
    id: 6,
    ministry: "Kementerian Pendidikan",
    vendor: "Canteen Services PLT",
    amount: 250000,
    method: "Open Tender",
    category: "Perkhidmatan",
    date: "2023-12-01",
    title: "Perkhidmatan Makanan Bermasak Asrama",
    crawledAt: new Date().toISOString()
  },
  {
    id: 7,
    ministry: "Kementerian Dalam Negeri",
    vendor: "Datasonic Technologies",
    amount: 3500000,
    method: "Direct Negotiation",
    category: "Bekalan",
    date: "2023-06-15",
    title: "Pembekalan Cip Pasport",
    reason: "Kesinambungan kontrak sedia ada",
    crawledAt: new Date().toISOString()
  },
  {
    id: 8,
    ministry: "Kementerian Belia dan Sukan",
    vendor: "Arena Sports Hub",
    amount: 450000,
    method: "Open Tender",
    category: "Perkhidmatan",
    date: "2023-10-30",
    title: "Penganjuran Hari Sukan Negara Peringkat Kebangsaan",
    crawledAt: new Date().toISOString()
  },
  {
    id: 9,
    ministry: "Jabatan Perdana Menteri",
    vendor: "Event Master Enterprise",
    amount: 120000,
    method: "Open Tender",
    category: "Perkhidmatan",
    date: "2023-08-31",
    title: "Sambutan Hari Kebangsaan Logistics",
    crawledAt: new Date().toISOString()
  },
  {
    id: 10,
    ministry: "Kementerian Ekonomi",
    vendor: "Big Data Analytics Sdn Bhd",
    amount: 2100000,
    method: "Open Tender",
    category: "Perkhidmatan",
    date: "2023-09-10",
    title: "Development of PADU Database Analytics Module",
    crawledAt: new Date().toISOString()
  }
];