export const formatMoney = (amount: number, locale: 'en' | 'ms' = 'en'): string => {
  // Use 'ms-MY' for Malay to get appropriate formatting (e.g. potential comma/dot differences), 
  // though RM format is generally standardized.
  const localeString = locale === 'ms' ? 'ms-MY' : 'en-MY';
  return new Intl.NumberFormat(localeString, {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(amount).replace('MYR', 'RM');
};

export const formatDate = (dateStr: string): string => {
  return dateStr; // Already YYYY-MM-DD
};

// Helper to Title Case Malay names
const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

// Returns the display name based on language preference
export const getMinistryLabel = (rawName: string, lang: 'en' | 'ms'): string => {
  if (lang === 'ms') {
    return toTitleCase(rawName);
  }
  return translateMinistry(rawName);
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
    "JABATAN PERDANA MENTERI": "Prime Minister's Department (JPM)"
  };

  // Direct match
  if (map[normalized]) return map[normalized];

  // Partial matches for messy data
  if (normalized.includes("KESIHATAN")) return "Ministry of Health (MOH)";
  if (normalized.includes("PENDIDIKAN") && !normalized.includes("TINGGI")) return "Ministry of Education (MOE)";
  if (normalized.includes("POLIS DIRAJA")) return "Royal Malaysia Police (PDRM)";
  if (normalized.includes("JABATAN BOMBA")) return "Fire & Rescue Department";

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