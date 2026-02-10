import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ms';

const translations = {
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
    no_records: "No Records Available",
    
    // Filters & Headers
    filter_sort: "Sort By",
    filter_cat: "Category",
    filter_method: "Method",
    th_date: "Date",
    th_ministry: "Ministry",
    th_vendor: "Vendor",
    th_value: "Value",
    th_details: "Method & Category",
    
    // Values
    val_newest: "Newest First",
    val_highest: "Highest Value",
    val_all_cat: "All Categories",
    val_all_method: "All Methods",
    val_open_tender: "Open Tender",
    val_direct_nego: "Direct Negotiation",

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

    // Vendor List
    ven_title: "Vendor Directory",
    ven_subtitle: "Companies awarded government contracts.",
    ven_search: "Search company name...",
    ven_contracts_won: "Contracts Won",
    ven_ministries_served: "Ministries Served",
    ven_total_value: "Total Value",
    ven_rank: "Rank",

    // About
    abt_title: "Transparency in Action",
    abt_subtitle: "GovWatch MY is an independent initiative to visualize, track, and analyze Malaysian government procurement data.",
    abt_accountability: "Accountability",
    abt_accountability_desc: "Ensuring tax money is spent efficiently by monitoring Direct Negotiations vs Open Tenders.",
    abt_opendata: "Open Data",
    abt_opendata_desc: "Converting unstructured HTML tables into clean, machine-readable formats for public analysis.",
    abt_accessibility: "Accessibility",
    abt_accessibility_desc: "Making complex financial data easy to understand through interactive dashboards and charts.",
    abt_methodology: "Methodology",
    abt_similar: "Similar Initiatives",
    abt_disclaimer: "Disclaimer",
    abt_not_official: "Not an Official Government Website."
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
    no_records: "Tiada Rekod",

    // Filters & Headers
    filter_sort: "Susunan",
    filter_cat: "Kategori",
    filter_method: "Kaedah",
    th_date: "Tarikh",
    th_ministry: "Kementerian",
    th_vendor: "Pembekal",
    th_value: "Nilai",
    th_details: "Kaedah & Kategori",

    // Values
    val_newest: "Terkini",
    val_highest: "Nilai Tertinggi",
    val_all_cat: "Semua Kategori",
    val_all_method: "Semua Kaedah",
    val_open_tender: "Tender Terbuka",
    val_direct_nego: "Rundingan Terus",

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

    // Vendor List
    ven_title: "Direktori Pembekal",
    ven_subtitle: "Syarikat yang dianugerahkan kontrak kerajaan.",
    ven_search: "Cari nama syarikat...",
    ven_contracts_won: "Kontrak Dimenangi",
    ven_ministries_served: "Kementerian Dilayan",
    ven_total_value: "Jumlah Nilai",
    ven_rank: "Kedudukan",

    // About
    abt_title: "Ketelusan Dalam Tindakan",
    abt_subtitle: "GovWatch MY adalah inisiatif bebas untuk memvisualisasikan, menjejak, dan menganalisis data perolehan kerajaan Malaysia.",
    abt_accountability: "Akauntabiliti",
    abt_accountability_desc: "Memastikan wang cukai dibelanjakan dengan cekap dengan memantau Rundingan Terus vs Tender Terbuka.",
    abt_opendata: "Data Terbuka",
    abt_opendata_desc: "Menukar jadual HTML tidak berstruktur kepada format bersih yang boleh dibaca mesin untuk analisis awam.",
    abt_accessibility: "Kebolehcapaian",
    abt_accessibility_desc: "Menjadikan data kewangan yang kompleks mudah difahami melalui papan pemuka dan carta interaktif.",
    abt_methodology: "Metodologi",
    abt_similar: "Inisiatif Serupa",
    abt_disclaimer: "Penafian",
    abt_not_official: "Bukan Laman Web Rasmi Kerajaan."
  }
};

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: typeof translations['en'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

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
    <LanguageContext.Provider value={{ language, toggleLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
};