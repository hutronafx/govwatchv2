import { Record } from './types';

// SIMULATED DATA GENERATOR
// Used to populate the dashboard for demonstration purposes when no scraped data is available.

const generateMockData = (): Record[] => {
  const MINISTRIES = [
    "KEMENTERIAN PENDIDIKAN",
    "KEMENTERIAN KESIHATAN",
    "KEMENTERIAN KEWANGAN",
    "KEMENTERIAN DALAM NEGERI",
    "KEMENTERIAN PERTAHANAN",
    "KEMENTERIAN PENGANGKUTAN",
    "KEMENTERIAN KERJA RAYA",
    "JABATAN KERJA RAYA",
    "KEMENTERIAN PERTANIAN DAN KETERJAMINAN MAKANAN",
    "KEMENTERIAN EKONOMI",
    "KEMENTERIAN SAINS, TEKNOLOGI DAN INOVASI",
    "KEMENTERIAN KOMUNIKASI",
    "KEMENTERIAN SUMBER MANUSIA",
    "JABATAN PERDANA MENTERI",
    "KEMENTERIAN PELANCONGAN, SENI DAN BUDAYA",
    "KEMENTERIAN BELIA DAN SUKAN"
  ];

  const VENDOR_PREFIXES = ["Syarikat", "Tetuan", "Koperasi", "Pusat", "Agensi", "Perusahaan"];
  const VENDOR_NAMES = ["Maju", "Jaya", "Gemilang", "Wawasan", "Teknologi", "Bina", "Harmoni", "Mega", "Prima", "Global", "Putra", "Sinaran", "Impian", "Lestari", "Setia", "Puncak"];
  const VENDOR_SUFFIXES = ["Sdn Bhd", "Enterprise", "Trading", "Construction", "Resources", "PLT", "Solutions", "Services"];

  const CATEGORIES = ["Bekalan", "Perkhidmatan", "Kerja"];
  const METHODS = ["Tender Terbuka", "Rundingan Terus", "Sebut Harga", "Lantikan Terus"];

  const records: Record[] = [];

  for (let i = 1; i <= 1000; i++) {
    // Random Ministry
    const ministry = MINISTRIES[Math.floor(Math.random() * MINISTRIES.length)];

    // Random Vendor
    const prefix = VENDOR_PREFIXES[Math.floor(Math.random() * VENDOR_PREFIXES.length)];
    const name1 = VENDOR_NAMES[Math.floor(Math.random() * VENDOR_NAMES.length)];
    const name2 = VENDOR_NAMES[Math.floor(Math.random() * VENDOR_NAMES.length)];
    const suffix = VENDOR_SUFFIXES[Math.floor(Math.random() * VENDOR_SUFFIXES.length)];
    const vendor = `${prefix} ${name1} ${name2} ${suffix}`;

    // Random Amount (Weighted towards smaller amounts, occasional huge ones)
    // 80% < 500k, 15% < 2m, 5% > 2m
    let amount = 0;
    const rand = Math.random();
    if (rand > 0.95) {
        amount = Math.floor(Math.random() * 50000000) + 2000000; // 2m - 52m
    } else if (rand > 0.8) {
        amount = Math.floor(Math.random() * 1500000) + 500000; // 500k - 2m
    } else {
        amount = Math.floor(Math.random() * 480000) + 20000; // 20k - 500k
    }

    // Random Date (Last 365 days)
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - Math.floor(Math.random() * 365));
    const date = dateObj.toISOString().split('T')[0];

    // Method & Reason
    const method = METHODS[Math.floor(Math.random() * METHODS.length)];
    let reason: string | null = null;
    
    // Add fake reasons for Direct Negotiations
    if (method === "Rundingan Terus") {
        const reasons = [
            "Kelulusan Khas Perbendaharaan",
            "Perolehan Darurat / Bencana Alam",
            "Keserasian (Compatibility) dengan sistem sedia ada",
            "Satu-satunya sumber (Sole Source)",
            "Kepentingan Strategik Negara"
        ];
        if (Math.random() > 0.3) {
            reason = reasons[Math.floor(Math.random() * reasons.length)];
        }
    }

    // Category logic (some ministries skew towards certain categories)
    let category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    if (ministry.includes("KERJA RAYA")) category = "Kerja"; // Public Works mostly does Works

    records.push({
      id: i,
      ministry,
      vendor,
      amount,
      method,
      category,
      date,
      reason,
      sourceUrl: "#demo-data",
      crawledAt: new Date().toISOString()
    });
  }

  // Inject a few "High Profile" Anomalies for visual interest
  records.push({
      id: 1001,
      ministry: "KEMENTERIAN PERTAHANAN",
      vendor: "AeroSystem Defence Technologies Sdn Bhd",
      amount: 450000000, // 450 Million
      method: "Rundingan Terus",
      category: "Bekalan",
      date: new Date().toISOString().split('T')[0],
      reason: "Kontrak Penyelenggaraan Jet Pejuang (Keselamatan Negara)",
      sourceUrl: "#demo-high-value",
      crawledAt: new Date().toISOString()
  });

  return records.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const INITIAL_RECORDS: Record[] = generateMockData();