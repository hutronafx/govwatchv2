import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { MinistryDetail } from './views/MinistryDetail';
import { MinistryList } from './views/MinistryList';
import { VendorList } from './views/VendorList';
import { VendorDetail } from './views/VendorDetail';
import { Upload } from './views/Upload';
import { About } from './views/About';
import { ViewConfig, Record } from './types';
import { LanguageProvider } from './i18n';
import { AlertTriangle, Database, Loader2 } from 'lucide-react';
import { INITIAL_RECORDS } from './data';

function AppContent() {
  const [viewConfig, setViewConfig] = useState<ViewConfig>({ view: 'dashboard' });
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');

  // Auto-fetch data on startup
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsConnected(false);
    
    // Strategy: 
    // 1. Try GitHub (Primary Source) - WITH ROBUST PARSING
    // 2. If fail, try Local /data.json (Backup)
    // 3. If fail, use Hardcoded INITIAL_RECORDS (Last Resort)

    const GITHUB_URL = `https://raw.githubusercontent.com/hutronafx/govwatchv2/main/Myprocurementdata%20complete.json`;
    
    // Helper to process raw JSON into our Record type
    const processData = (jsonData: any[], sourceName: string) => {
        if (!Array.isArray(jsonData)) throw new Error("Data is not an array");
        
        const cleanData: Record[] = [];
        jsonData.forEach((row: any, index: number) => {
            // Flexible Column Mapping: Checks for Capitalized (Excel) or Lowercase (JSON) keys
            const ministry = row['Ministry'] || row['ministry'] || row['Kementerian'] || row['Agency'] || row['Agensi'] || "Unknown Ministry";
            const vendor = row['Vendor'] || row['vendor'] || row['Petender'] || row['Tenderer'] || row['Nama Syarikat'] || row['Company'] || "Unknown Vendor";
            const title = row['Title'] || row['title'] || row['Tajuk'] || row['Description'] || row['Tajuk Projek'] || row['Project Title'] || "";
            const method = row['Method'] || row['method'] || row['Kaedah'] || row['Procurement Method'] || row['Mode'] || "Open Tender";
            
            // Amount Cleaning (Remove RM, commas, etc)
            let amount = 0;
            const rawAmount = row['Price'] || row['amount'] || row['price'] || row['Nilai'] || row['Harga'] || row['Amount'] || row['Contract Value'] || row['Cost'];
            if (typeof rawAmount === 'number') amount = rawAmount;
            else if (typeof rawAmount === 'string') {
                amount = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""));
            }

            // Date Cleaning
            let dateStr = row['Date'] || row['date'] || row['Tarikh'] || row['Award Date'] || row['Contract Date'] || new Date().toISOString().split('T')[0];
            if (typeof dateStr === 'number') {
                // Handle Excel serial date
                const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
                if (!isNaN(dateObj.getTime())) {
                    dateStr = dateObj.toISOString().split('T')[0];
                } else {
                    dateStr = new Date().toISOString().split('T')[0];
                }
            } else if (typeof dateStr === 'string') {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toISOString().split('T')[0];
                }
            }

            // Category Inference
            let category = row['Category'] || row['category'] || row['Kategori'] || "General";
            if (category === "General" || !category) {
                 const t = (title || "").toLowerCase();
                 if (t.includes('bina') || t.includes('road') || t.includes('bangunan') || t.includes('kerja') || t.includes('upgrad') || t.includes('construction') || t.includes('renovation')) category = 'Kerja';
                 else if (t.includes('supply') || t.includes('bekal') || t.includes('ubat') || t.includes('equipment') || t.includes('peralatan') || t.includes('drug')) category = 'Bekalan';
                 else if (t.includes('service') || t.includes('khidmat') || t.includes('sewa') || t.includes('lanti') || t.includes('security') || t.includes('clean') || t.includes('consult')) category = 'Perkhidmatan';
            }

            if (amount > 0 || (ministry !== "Unknown Ministry" && vendor !== "Unknown Vendor")) {
                cleanData.push({
                    id: row.id || index + 1,
                    ministry: String(ministry).trim(),
                    vendor: String(vendor).trim(),
                    amount: amount || 0,
                    method: String(method).trim(),
                    category: String(category).trim(),
                    date: String(dateStr).trim(),
                    title: String(title).trim(),
                    sourceUrl: sourceName,
                    crawledAt: row['crawledAt'] || new Date().toISOString()
                });
            }
        });
        return cleanData;
    };

    try {
        // Attempt 1: GitHub
        console.log(`[GovWatch] Attempting GitHub Fetch: ${GITHUB_URL}`);
        const ghRes = await fetch(GITHUB_URL);
        if (!ghRes.ok) throw new Error(`GitHub Status: ${ghRes.status}`);
        
        // Use .text() instead of .json() to manually handle parsing errors
        const textData = await ghRes.text();
        let ghJson;

        try {
            ghJson = JSON.parse(textData);
        } catch (parseError: any) {
            console.warn(`[GovWatch] JSON Parse Error: ${parseError.message}. Attempting to sanitize...`);
            
            // SANITIZATION LOGIC
            // The error "Unexpected non-whitespace character after JSON" usually