import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { MinistryDetail } from './views/MinistryDetail';
import { Upload } from './views/Upload';
import { INITIAL_RECORDS } from './data';
import { ViewConfig, Record } from './types';

function App() {
  const [viewConfig, setViewConfig] = useState<ViewConfig>({ view: 'dashboard' });
  const [records, setRecords] = useState<Record[]>(INITIAL_RECORDS);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-fetch data on startup
  const fetchData = async () => {
    try {
      const response = await fetch('/data.json');
      if (response.ok) {
        const rawData = await response.json();
        
        // NORMALIZE DATA
        // Handles both clean scraper data and raw Excel/JSON exports with "__EMPTY" keys
        const cleanData: Record[] = [];
        if (Array.isArray(rawData)) {
             rawData.forEach((item: any, index: number) => {
                // 1. Skip Header Rows (SheetJS/Excel artifacts)
                if (item['__EMPTY'] === 'TAJUK SEBUT HARGA' || item['__EMPTY_3'] === 'KEMENTERIAN') return;

                // 2. Map fields
                // Check if it's already a valid Record (from scraper) or a raw sheet row
                const ministry = item.ministry || item['__EMPTY_3'] || "Unknown Ministry";
                const vendor = item.vendor || item['__EMPTY_4'] || "Unknown Vendor";
                
                // Parse Amount (Handle "RM 4,000.00" or raw numbers)
                let amount = 0;
                if (typeof item.amount === 'number') amount = item.amount;
                else if (item['__EMPTY_8']) {
                    amount = parseFloat(String(item['__EMPTY_8']).replace(/[^0-9.-]+/g, ""));
                } else if (typeof item.amount === 'string') {
                    amount = parseFloat(item.amount.replace(/[^0-9.-]+/g, ""));
                }

                // Parse Date
                // Use decision date (__EMPTY_6) or acceptance date (__EMPTY_7)
                let date = item.date || item['__EMPTY_6'];
                if (!date || date === 'TIADA MAKLUMAT') date = item['__EMPTY_7'];
                if (!date || date === 'TIADA MAKLUMAT') date = new Date().toISOString().split('T')[0];
                
                // Clean date if it has time "2025-12-11 04:45:01" -> "2025-12-11"
                if (date && typeof date === 'string' && date.includes(' ')) {
                    date = date.split(' ')[0];
                }

                // Map Category/Method
                const method = item.method || item['__EMPTY_2'] || "Open Tender";

                // Only add if it looks like a real record
                if (ministry !== "Unknown Ministry" || amount > 0) {
                    cleanData.push({
                        id: index + 1,
                        ministry: String(ministry).trim(),
                        vendor: String(vendor).trim(),
                        amount: amount || 0,
                        method: String(method).trim(),
                        date: String(date).trim(),
                        reason: item.reason || null
                    });
                }
             });
        }

        if (cleanData.length > 0) {
          setRecords(cleanData);
        } else {
            console.warn('Data loaded but no valid records found after normalization.');
        }
      } else {
        console.log('No existing data found, starting with empty database.');
      }
    } catch (error) {
      console.warn('Network error checking for data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // SECRET ROUTE LISTENER
    const checkHash = () => {
      if (window.location.hash === '#secret-admin-panel') {
        setViewConfig({ view: 'upload' });
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleNavigate = (view: 'dashboard' | 'upload') => {
    setViewConfig({ view });
    window.scrollTo(0, 0);
    if (view === 'dashboard' && window.location.hash === '#secret-admin-panel') {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  };

  const handleMinistryClick = (ministryName: string) => {
    setViewConfig({ view: 'ministry', ministryName });
    window.scrollTo(0, 0);
  };

  const handleDataLoaded = (newRecords: Record[]) => {
    setRecords(newRecords);
    handleNavigate('dashboard');
  };

  return (
    <Layout activeView={viewConfig.view} onNavigate={handleNavigate}>
      {viewConfig.view === 'dashboard' && (
        <Dashboard 
          records={records} 
          isLoading={isLoading}
          onMinistryClick={handleMinistryClick} 
        />
      )}
      
      {viewConfig.view === 'ministry' && viewConfig.ministryName && (
        <MinistryDetail 
          ministryName={viewConfig.ministryName} 
          records={records}
          onBack={() => handleNavigate('dashboard')}
        />
      )}

      {viewConfig.view === 'upload' && (
        <Upload onDataLoaded={handleDataLoaded} />
      )}
    </Layout>
  );
}

export default App;