export const formatMoney = (amount: number, locale: 'en' | 'ms' = 'en'): string => {
  const localeString = locale === 'ms' ? 'ms-MY' : 'en-MY';
  return new Intl.NumberFormat(localeString, {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(amount).replace('MYR', 'RM');
};

export const formatMoneyCompact = (amount: number, locale: 'en' | 'ms' = 'en'): string => {
  const localeString = locale === 'ms' ? 'ms-MY' : 'en-MY';
  const formatter = new Intl.NumberFormat(localeString, {
    style: 'currency',
    currency: 'MYR',
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return formatter.format(amount).replace('MYR', 'RM');
};

// Full formatted number for hover tooltips
export const formatMoneyFull = (amount: number, locale: 'en' | 'ms' = 'en'): string => {
  const localeString = locale === 'ms' ? 'ms-MY' : 'en-MY';
  return new Intl.NumberFormat(localeString, {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('MYR', 'RM');
};

// Approximate MYR→USD rate (updated periodically)
export const MYR_TO_USD = 0.22;

export const formatMoneyUSD = (amountMYR: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amountMYR * MYR_TO_USD);
};

export const formatMoneyUSDFull = (amountMYR: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMYR * MYR_TO_USD);
};

import { format, parseISO, isValid } from 'date-fns';

export const formatDateSafe = (dateVal: string | Date | any): string => {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  } catch (e) {
    // Ignore
  }
  return String(dateVal); // Fallback
};

export const formatDateTimeSafe = (dateVal: string | Date | any, locale: 'en' | 'ms' = 'en'): string => {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
    if (isValid(d)) {
      // Very basic localization format, adjust as needed
      return format(d, "dd MMM yyyy, HH:mm");
    }
  } catch (e) {
    // Ignore
  }
  return String(dateVal); // Fallback
};

// Helper to Title Case Malay names
const toTitleCase = (str: string) => {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

// Returns the canonical Malay name for grouping
export const cleanMinistryName = (rawName: string): string => {
  let normalized = rawName.toUpperCase().trim();

  // Remove "MALAYSIA" suffix if present (e.g., KEMENTERIAN PENDIDIKAN MALAYSIA -> KEMENTERIAN PENDIDIKAN)
  if (normalized.endsWith(" MALAYSIA")) {
    normalized = normalized.substring(0, normalized.length - 9).trim();
  }

  // Canonical Mappings for known inconsistencies
  if (normalized === "KEMENTERIAN PENDIDIKAN" || (normalized.includes("PENDIDIKAN") && !normalized.includes("TINGGI"))) return "Kementerian Pendidikan";
  if (normalized.includes("KESIHATAN")) return "Kementerian Kesihatan";
  if (normalized.includes("KEWANGAN")) return "Kementerian Kewangan";
  if (normalized.includes("PERTAHANAN")) return "Kementerian Pertahanan";
  if (normalized.includes("DALAM NEGERI") && !normalized.includes("PERDAGANGAN")) return "Kementerian Dalam Negeri";
  if (normalized.includes("PENGANGKUTAN")) return "Kementerian Pengangkutan";
  if (normalized.includes("KERJA RAYA") && !normalized.includes("JABATAN")) return "Kementerian Kerja Raya";
  if (normalized.includes("JABATAN KERJA RAYA")) return "Jabatan Kerja Raya";
  if (normalized.includes("PERTANIAN")) return "Kementerian Pertanian & Keterjaminan Makanan";
  if (normalized.includes("KOMUNIKASI") && !normalized.includes("DIGITAL")) return "Kementerian Komunikasi";
  if (normalized.includes("DIGITAL")) return "Kementerian Digital";

  return toTitleCase(normalized);
};

// Returns the display name based on language preference
export const getMinistryLabel = (rawName: string, lang: 'en' | 'ms'): string => {
  // Normalize first to ensure consistent translation lookups
  const cleaned = cleanMinistryName(rawName);

  if (lang === 'ms') {
    return cleaned;
  }
  return translateMinistry(cleaned);
};

export const translateMinistry = (malayName: string): string => {
  const normalized = malayName.toUpperCase().trim();

  const map: { [key: string]: string } = {
    "KEMENTERIAN PENDIDIKAN": "Ministry of Education (MOE)",
    "KEMENTERIAN KESIHATAN": "Ministry of Health (MOH)",
    "KEMENTERIAN KEWANGAN": "Ministry of Finance (MOF)",
    "KEMENTERIAN DALAM NEGERI": "Ministry of Home Affairs (KDN)",
    "KEMENTERIAN PERTAHANAN": "Ministry of Defence (MINDEF)",
    "KEMENTERIAN PENGANGKUTAN": "Ministry of Transport (MOT)",
    "KEMENTERIAN KERJA RAYA": "Ministry of Works (KKR)",
    "JABATAN KERJA RAYA": "Public Works Department (JKR)",
    "KEMENTERIAN PERTANIAN DAN KETERJAMINAN MAKANAN": "Ministry of Agriculture (KPKM)",
    "KEMENTERIAN PERTANIAN": "Ministry of Agriculture (KPKM)",
    "KEMENTERIAN EKONOMI": "Ministry of Economy",
    "KEMENTERIAN KEMAJUAN DESA DAN WILAYAH": "Ministry of Rural & Regional Dev",
    "KEMENTERIAN SAINS, TEKNOLOGI DAN INOVASI": "Ministry of Science & Tech (MOSTI)",
    "KEMENTERIAN KOMUNIKASI": "Ministry of Communications",
    "KEMENTERIAN DIGITAL": "Ministry of Digital",
    "KEMENTERIAN SUMBER MANUSIA": "Ministry of Human Resources (KESUMA)",
    "KEMENTERIAN PELANCONGAN, SENI DAN BUDAYA": "Ministry of Tourism (MOTAC)",
    "KEMENTERIAN BELIA DAN SUKAN": "Ministry of Youth & Sports (KBS)",
    "KEMENTERIAN LUAR NEGERI": "Ministry of Foreign Affairs (Wisma Putra)",
    "KEMENTERIAN PENDIDIKAN TINGGI": "Ministry of Higher Education (MOHE)",
    "KEMENTERIAN PERUMAHAN DAN KERAJAAN TEMPATAN": "Ministry of Housing (KPKT)",
    "JABATAN PERDANA MENTERI": "Prime Minister's Department (JPM)",
    "POLIS DIRAJA MALAYSIA": "Royal Malaysia Police (PDRM)",
    "POLIS DIRAJA": "Royal Malaysia Police (PDRM)",
    "JABATAN BOMBA DAN PENYELAMAT MALAYSIA": "Fire & Rescue Department",
    "JABATAN BOMBA": "Fire & Rescue Department",
    "KEMENTERIAN PEMBANGUNAN WANITA, KELUARGA DAN MASYARAKAT": "Ministry of Women, Family & Community",
    "KEMENTERIAN PERDAGANGAN DALAM NEGERI DAN KOS SARA HIDUP": "Ministry of Domestic Trade (KPDN)",
    "KEMENTERIAN PERLADANGAN DAN KOMODITI": "Ministry of Plantation & Commodities",
    "KEMENTERIAN SUMBER ASLI, ALAM SEKITAR DAN PERUBAHAN IKLIM": "Ministry of Natural Resources (NRECC)",
    "KEMENTERIAN TENAGA DAN SUMBER ASLI": "Ministry of Energy & Natural Resources",
    "KEMENTERIAN WILAYAH PERSEKUTUAN": "Ministry of Federal Territories"
  };

  // Direct match
  if (map[normalized]) return map[normalized];

  // Partial matches for messy data
  if (normalized.includes("KESIHATAN")) return "Ministry of Health (MOH)";
  if (normalized.includes("PENDIDIKAN") && !normalized.includes("TINGGI")) return "Ministry of Education (MOE)";
  if (normalized.includes("PENDIDIKAN TINGGI")) return "Ministry of Higher Education (MOHE)";
  if (normalized.includes("POLIS DIRAJA")) return "Royal Malaysia Police (PDRM)";
  if (normalized.includes("JABATAN BOMBA")) return "Fire & Rescue Department";
  if (normalized.includes("KEWANGAN")) return "Ministry of Finance (MOF)";
  if (normalized.includes("DALAM NEGERI") && !normalized.includes("PERDAGANGAN")) return "Ministry of Home Affairs (KDN)";
  if (normalized.includes("PERTAHANAN")) return "Ministry of Defence (MINDEF)";
  if (normalized.includes("PENGANGKUTAN")) return "Ministry of Transport (MOT)";
  if (normalized.includes("KERJA RAYA")) return "Ministry of Works (KKR)";
  if (normalized.includes("PERTANIAN")) return "Ministry of Agriculture (KPKM)";
  if (normalized.includes("EKONOMI")) return "Ministry of Economy";
  if (normalized.includes("KOMUNIKASI")) return "Ministry of Communications";
  if (normalized.includes("SUMBER MANUSIA")) return "Ministry of Human Resources (KESUMA)";

  // Fallback: title case the malay name
  return toTitleCase(normalized);
};

export const downloadCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(fieldName => {
      const value = row[fieldName] ? String(row[fieldName]).replace(/"/g, '""') : '';
      return `"${value}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};