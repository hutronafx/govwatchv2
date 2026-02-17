import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ms';

const defaultTranslations = {
  en: {
    nav_dashboard: "Dashboard",
    nav_ministries: "Ministries",
    nav_vendors: "Vendors",
    nav_about: "About",
    
    // Dashboard
    kpi_total_value: "Total Contract Value",
    kpi_works: "Works & Construction",
    kpi_supplies: "Supplies & Services",
    chart_top_ministries: "Top Spending Ministries",
    chart_categories: "Category Breakdown",
    table_recent_awards: "Recent Awards",
    search_placeholder: "Search records...",
    btn_refresh: "Refresh Data",
    btn_syncing: "Syncing...",
    lbl_updated: "Updated",
    lbl_data_period: "Data from 1st January 2023 to present. Updated weekly.",
    no_records: "No Records Available",
    no_records_desc: "Data is currently being updated. Please check back shortly or click refresh.",
    btn_fetch_initial: "Fetch Initial Data",
    loading_dashboard: "Loading Dashboard...",
    loading_scraper: "Scraping live data... This may take ~1 minute.",
    scraper_success: "Updated! Found {{count}} records. Reloading...",
    scraper_fail: "Scrape failed. Check logs.",
    scraper_network_error: "Network error connecting to scraper.",
    
    // Charts Labels
    cat_works: "Works",
    cat_supplies: "Supplies",
    cat_services: "Services",

    // Filters & Headers
    filter_sort: "Sort By",
    filter_cat: "Category",
    filter_method: "Method",
    th_date: "Date",
    th_ministry: "Ministry",
    th_vendor: "Vendor",
    th_value: "Value",
    th_details: "Method & Category",
    
    // Values & Options
    val_newest: "Newest First",
    val_highest: "Highest Value",
    opt_all_cat: "All Categories",
    opt_works: "Works",
    opt_supplies: "Supplies",
    opt_services: "Services",
    opt_all_methods: "All Methods",
    val_open_tender: "Open Tender",
    val_direct_nego: "Direct Negotiation",
    
    // Table States
    tbl_no_results: "No records found matching your filters.",
    tbl_showing_top: "Showing top {{count}} recent results",

    // Ministry List
    min_title: "Ministries & Agencies",
    min_subtitle: "Breakdown of spending by government body.",
    min_search: "Find a ministry...",
    min_contracts: "Contracts",
    min_total_spend: "Total Spend",

    // Ministry Detail
    det_back: "Back to Dashboard",
    det_profile: "Ministry Profile",
    det_integrity: "Procurement Integrity",
    det_risk_analysis: "Risk Analysis",
    det_risk_high: "High risk of limited competition. A significant portion of contracts are awarded via Direct Negotiation.",
    det_risk_low: "Healthy procurement mix. Most contracts appear to be competitive.",
    det_vendor_dom: "Vendor Dominance",
    det_contract_history: "Contract History",
    det_justification: "Direct Negotiation Justification",
    lbl_method_breakdown: "Method Breakdown (by count)",
    lbl_direct_short: "Direct",
    lbl_open_short: "Open/Quote",
    lbl_percent_spend: "of total spend",
    lbl_standard_procurement: "Standard procurement via open tender process.",
    lbl_verified_on: "Verified on",
    
    // Vendor Detail
    det_vendor_profile: "Vendor Profile",
    det_ministries_served: "Ministries Served",
    
    // Risk Score
    det_risk_score: "Procurement Risk Score",
    det_risk_level: "Risk Level",
    risk_lvl_high: "Critical",
    risk_lvl_med: "Moderate",
    risk_lvl_low: "Low",
    risk_explanation: "Score based on Direct Negotiation ratio (60%) and Vendor Concentration (40%).",

    // Vendor List
    ven_title: "Vendor Directory",
    ven_subtitle: "Companies awarded government contracts.",
    ven_search: "Search company name...",
    ven_contracts_won: "Contracts Won",
    ven_ministries_served: "Ministries Served",
    ven_total_value: "Total Value",
    ven_rank: "Kedudukan",
    th_company_name: "Company Name",
    msg_no_vendors: "No vendors found matching your search.",

    // Admin / Upload
    admin_restricted: "Restricted Access",
    admin_enter_pin: "Enter Admin PIN",
    admin_unlock: "Unlock",
    admin_update_db: "Update Database",
    admin_mode_active: "ADMIN MODE ACTIVE",
    admin_server_scraper: "Server Scraper",
    admin_server_desc: "Attempts to scrape from the server. May fail if IP is blocked.",
    admin_start_scrape: "Start Auto-Scrape",
    admin_running: "Running...",
    admin_issue: "Issue Detected",
    admin_view_log: "View Debug Log",
    admin_refresh_log: "Refresh Log",
    admin_browser_script: "Browser Script",
    admin_script_desc: "If the server scraper is blocked, copy this code and run it in your browser console on the government portal.",
    admin_copy_code: "Copy Code",
    admin_json_upload: "JSON Upload",
    admin_drop_file: "Drop govwatch_data.json here",
    admin_browse_files: "Semak Fail",
    admin_invalid_file: "Invalid File",
    admin_scrape_success: "Berjaya! Jumlah rekod:",
    admin_scrape_fail_blocked: "Pengikis berjalan tetapi menemui 0 rekod. IP pelayan mungkin disekat.",
    admin_load_dashboard: "Pengikisan selesai. Muatkan papan pemuka?",

    // About
    abt_title: "Transparency in Action",
    abt_subtitle: "GovWatch MY is an independent initiative to visualise, track, and analyse Malaysian government procurement data.",
    
    abt_value_headline: "Every Ringgit Counted. Every Contract Tracked.",
    abt_value_desc: "Malaysia spends billions on procurement every year. We turned thousands of scattered data cards into a searchable database so you can see exactly where the money goes. GovWatch empowers citizens, journalists, and researchers to monitor ministry spending, track direct negotiations, and demand efficiency.",
    
    abt_mission_title: "Our Mission: Increasing Transparency",
    abt_mission_desc_1: "As Malaysian students, we realised that transparency isn't just a policy problem, but a data accessibility problem. Millions of ringgit in procurement data exists, but it is locked behind unstructured tables and bureaucratic jargon.",
    abt_mission_desc_2: "GovWatch bridges the gap between Civic Engagement and Software Engineering. We don't just ask for transparency; we code the tools to enforce it. By converting raw spending data into interactive visualizations, we empower voters, journalists, and student leaders to hold institutions accountable with maths, not just rhetoric.",

    abt_accountability: "Accountability",
    abt_accountability_desc: "Ensuring tax money is spent efficiently by monitoring Direct Negotiations vs Open Tenders.",
    abt_opendata: "Open Data",
    abt_opendata_desc: "Converting unstructured HTML tables into clean, machine-readable formats for public analysis.",
    abt_accessibility: "Accessibility",
    abt_accessibility_desc: "Making complex financial data easy to understand through interactive dashboards and charts.",
    abt_methodology: "Methodology",
    abt_methodology_text: "GovWatch aggregates data from public government portals, specifically the MyProcurement system managed by the Ministry of Finance.",
    abt_similar: "Similar Initiatives",
    abt_disclaimer: "Disclaimer",
    abt_not_official: "Not an Official Government Website.",

    // Footer Credits
    ftr_developer: "Lead Developer & Founder",
    ftr_role: "Student & Founder of",
    ftr_built: "Built as an independent initiative to modernise Malaysian civic data."
  },
  ms: {
    nav_dashboard: "Papan Pemuka",
    nav_ministries: "Kementerian",
    nav_vendors: "Pembekal",
    nav_about: "Tentang",
    
    // Dashboard
    kpi_total_value: "Jumlah Nilai Kontrak",
    kpi_works: "Kerja & Binaan",
    kpi_supplies: "Bekalan & Perkhidmatan",
    chart_top_ministries: "Perbelanjaan Utama Kementerian",
    chart_categories: "Pecahan Kategori",
    table_recent_awards: "Anugerah Terkini",
    search_placeholder: "Cari rekod...",
    btn_refresh: "Muat Semula",
    btn_syncing: "Sedang Segerak...",
    lbl_updated: "Dikemaskini",
    lbl_data_period: "Data dari 1 Januari 2023 hingga kini. Dikemaskini setiap minggu.",
    no_records: "Tiada Rekod",
    no_records_desc: "Data sedang dikemaskini. Sila semak sebentar lagi atau klik muat semula.",
    btn_fetch_initial: "Dapatkan Data Asal",
    loading_dashboard: "Memuatkan Papan Pemuka...",
    loading_scraper: "Mengikis data langsung... Ini mungkin mengambil masa ~1 minit.",
    scraper_success: "Dikemaskini! Menemui {{count}} rekod. Memuat semula...",
    scraper_fail: "Gagal mengikis. Semak log.",
    scraper_network_error: "Ralat rangkaian menyambung ke pengikis.",

    // Charts Labels
    cat_works: "Kerja",
    cat_supplies: "Bekalan",
    cat_services: "Perkhidmatan",

    // Filters & Headers
    filter_sort: "Susunan",
    filter_cat: "Kategori",
    filter_method: "Kaedah",
    th_date: "Tarikh",
    th_ministry: "Kementerian",
    th_vendor: "Pembekal",
    th_value: "Nilai",
    th_details: "Kaedah & Kategori",

    // Values & Options
    val_newest: "Terkini",
    val_highest: "Nilai Tertinggi",
    opt_all_cat: "Semua Kategori",
    opt_works: "Kerja",
    opt_supplies: "Bekalan",
    opt_services: "Perkhidmatan",
    opt_all_methods: "Semua Kaedah",
    val_open_tender: "Tender Terbuka",
    val_direct_nego: "Rundingan Terus",

    // Table States
    tbl_no_results: "Tiada rekod ditemui yang sepadan dengan tapisan anda.",
    tbl_showing_top: "Menunjukkan {{count}} keputusan terkini",

    // Ministry List
    min_title: "Kementerian & Agensi",
    min_subtitle: "Pecahan perbelanjaan mengikut badan kerajaan.",
    min_search: "Cari kementerian...",
    min_contracts: "Kontrak",
    min_total_spend: "Jumlah Belanja",

    // Ministry Detail
    det_back: "Kembali ke Papan Pemuka",
    det_profile: "Profil Kementerian",
    det_integrity: "Integriti Perolehan",
    det_risk_analysis: "Analisis Risiko",
    det_risk_high: "Risiko tinggi persaingan terhad. Sebilangan besar kontrak dianugerahkan melalui Rundingan Terus.",
    det_risk_low: "Campuran perolehan yang sihat. Kebanyakan kontrak kelihatan kompetitif.",
    det_vendor_dom: "Dominasi Pembekal",
    det_contract_history: "Sejarah Kontrak",
    det_justification: "Justifikasi Rundingan Terus",
    lbl_method_breakdown: "Pecahan Kaedah (mengikut bilangan)",
    lbl_direct_short: "Terus",
    lbl_open_short: "Terbuka/Sebut Harga",
    lbl_percent_spend: "daripada jumlah perbelanjaan",
    lbl_standard_procurement: "Perolehan standard melalui proses tender terbuka.",
    lbl_verified_on: "Disahkan pada",
    
    // Vendor Detail
    det_vendor_profile: "Profil Pembekal",
    det_ministries_served: "Kementerian Dilayan",

    // Risk Score
    det_risk_score: "Skor Risiko Perolehan",
    det_risk_level: "Tahap Risiko",
    risk_lvl_high: "Kritikal",
    risk_lvl_med: "Sederhana",
    risk_lvl_low: "Rendah",
    risk_explanation: "Skor berdasarkan nisbah Rundingan Terus (60%) dan Konsentrasi Pembekal (40%).",

    // Vendor List
    ven_title: "Direktori Pembekal",
    ven_subtitle: "Syarikat yang dianugerahkan kontrak kerajaan.",
    ven_search: "Cari nama syarikat...",
    ven_contracts_won: "Kontrak Dimenangi",
    ven_ministries_served: "Kementerian Dilayan",
    ven_total_value: "Jumlah Nilai",
    ven_rank: "Kedudukan",
    th_company_name: "Nama Syarikat",
    msg_no_vendors: "Tiada pembekal ditemui yang sepadan dengan carian anda.",

    // Admin / Upload
    admin_restricted: "Akses Terhad",
    admin_enter_pin: "Masukkan PIN Admin",
    admin_unlock: "Buka Kunci",
    admin_update_db: "Kemaskini Pangkalan Data",
    admin_mode_active: "MOD ADMIN AKTIF",
    admin_server_scraper: "Pengikis Pelayan",
    admin_server_desc: "Cuba mengikis dari pelayan. Mungkin gagal jika IP disekat.",
    admin_start_scrape: "Mula Pengikisan Auto",
    admin_running: "Sedang berjalan...",
    admin_issue: "Isu Dikesan",
    admin_view_log: "Lihat Log Debug",
    admin_refresh_log: "Muat Semula Log",
    admin_browser_script: "Skrip Pelayar",
    admin_script_desc: "Jika pengikis pelayan disekat, salin kod ini dan jalankan dalam konsol pelayar anda di portal kerajaan.",
    admin_copy_code: "Salin Kod",
    admin_json_upload: "Muat Naik JSON",
    admin_drop_file: "Letak govwatch_data.json di sini",
    admin_browse_files: "Semak Fail",
    admin_invalid_file: "Fail Tidak Sah",
    admin_scrape_success: "Berjaya! Jumlah rekod:",
    admin_scrape_fail_blocked: "Pengikis berjalan tetapi menemui 0 rekod. IP pelayan mungkin disekat.",
    admin_load_dashboard: "Pengikisan selesai. Muatkan papan pemuka?",

    // About
    abt_title: "Ketelusan Dalam Tindakan",
    abt_subtitle: "GovWatch MY adalah inisiatif bebas untuk memvisualisasikan, menjejak, dan menganalisis data perolehan kerajaan Malaysia.",

    abt_value_headline: "Setiap Ringgit Dikira. Setiap Kontrak Dijejak.",
    abt_value_desc: "Malaysia membelanjakan berbilion ringgit untuk perolehan setiap tahun. Kami menukar beribu-ribu kad data yang berselerak kepada pangkalan data yang boleh dicari supaya anda boleh melihat dengan tepat ke mana wang itu pergi. GovWatch memperkasakan rakyat, wartawan, dan penyelidik untuk memantau perbelanjaan kementerian, menjejak rundingan terus, dan menuntut kecekapan.",

    abt_mission_title: "Misi Kami: Meningkatkan Ketelusan",
    abt_mission_desc_1: "Sebagai pelajar Malaysia, kami menyedari bahawa ketelusan bukan sekadar masalah dasar, tetapi masalah kebolehcapaian data. Berjuta-juta ringgit dalam data perolehan wujud, tetapi ia terkunci di sebalik jadual yang tidak berstruktur dan jargon birokrasi.",
    abt_mission_desc_2: "GovWatch merapatkan jurang antara Penglibatan Sivik dan Kejuruteraan Perisian. Kami bukan sekadar meminta ketelusan; kami membina alat untuk menguatkuasakannya. Dengan menukar data perbelanjaan mentah kepada visualisasi interaktif, kami memperkasakan pengundi, wartawan, dan pemimpin pelajar untuk memastikan institusi bertanggungjawab dengan matematik, bukan sekadar retorik.",

    abt_accountability: "Akauntabiliti",
    abt_accountability_desc: "Memastikan wang cukai dibelanjakan dengan cekap dengan memantau Rundingan Terus vs Tender Terbuka.",
    abt_opendata: "Data Terbuka",
    abt_opendata_desc: "Menukar jadual HTML tidak berstruktur kepada format bersih yang boleh dibaca mesin untuk analisis awam.",
    abt_accessibility: "Kebolehcapaian",
    abt_accessibility_desc: "Menjadikan data kewangan yang kompleks mudah difahami melalui papan pemuka dan carta interaktif.",
    abt_methodology: "Metodologi",
    abt_methodology_text: "GovWatch mengagregat data from public government portals, specifically the MyProcurement system managed by the Ministry of Finance.",
    abt_similar: "Inisiatif Serupa",
    abt_disclaimer: "Penafian",
    abt_not_official: "Bukan Laman Web Rasmi Kerajaan.",

    // Footer Credits
    ftr_developer: "Pembangun Utama & Pengasas",
    ftr_role: "Pelajar & Pengasas",
    ftr_built: "Dibina sebagai inisiatif bebas untuk memodenkan data sivik Malaysia."
  }
};

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: typeof defaultTranslations['en'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState(defaultTranslations);

  // Fetch localisation from GitHub
  useEffect(() => {
    const fetchLoc = async () => {
        try {
            // Corrected standard raw link based on user feedback (removed refs/heads/)
            const res = await fetch(`https://raw.githubusercontent.com/hutronafx/govwatchv2/main/localization.json`);
            if (res.ok) {
                const json = await res.json();
                if (json.en && json.ms) {
                    console.log("[GovWatch] Loaded dynamic localization.json from GitHub");
                    setTranslations(json);
                }
            } else {
              console.warn(`[GovWatch] Fetch failed with status: ${res.status}`);
            }
        } catch (e) {
            console.warn("[GovWatch] Failed to load localization.json. Using fallback defaults.", e);
        }
    };
    fetchLoc();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('govwatch_lang') as Language;
    if (saved) setLanguage(saved);
  }, []);

  const toggleLanguage = () => {
    setLanguage(prev => {
      const next = prev === 'en' ? 'ms' : 'en';
      localStorage.setItem('govwatch_lang', next);
      return next;
    });
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t: translations[language] || translations['en'] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
};