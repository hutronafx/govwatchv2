import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { MinistryDetail } from './views/MinistryDetail';
import { MinistryList } from './views/MinistryList';
import { VendorList } from './views/VendorList';
import { Upload } from './views/Upload';
import { About } from './views/About';
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
        const cleanData: Record[] = [];
        if (Array.isArray(rawData)) {
             rawData.forEach((item: any, index: number) => {
                // 1. Skip Header Rows
                if (item['__EMPTY'] === 'TAJUK SEBUT HARGA' || item['__EMPTY_3'] === 'KEMENTERIAN') return;

                // 2. Map fields
                const ministry = item.ministry || item['__EMPTY_3'] || "Unknown Ministry";
                const vendor = item.vendor || item['__EMPTY_4'] || "Unknown Vendor";
                
                // Parse Amount
                let amount = 0;
                if (typeof item.amount === 'number') amount = item.amount;
                else if (item['__EMPTY_8']) {
                    amount = parseFloat(String(item['__EMPTY_8']).replace(/[^0-9.-]+/g, ""));
                } else if (typeof item.amount === 'string') {
                    amount = parseFloat(item.amount.replace(/[^0-9.-]+/g, ""));
                }

                // Parse Date
                let date = item.date || item['__EMPTY_6'];
                if (!date || date === 'TIADA MAKLUMAT') date = item['__EMPTY_7'];
                if (!date || date === 'TIADA MAKLUMAT') date = new Date().toISOString().split('T')[0];
                if (date && typeof date === 'string' && date.includes(' ')) {
                    date = date.split(' ')[0];
                }

                // Map Category & Method
                const category = item.category || item['__EMPTY_2'] || "General";
                const method = item.method || "Open Tender";

                if (ministry !== "Unknown Ministry" || amount > 0) {
                    cleanData.push({
                        id: index + 1,
                        ministry: String(ministry).trim(),
                        vendor: String(vendor).trim(),
                        amount: amount || 0,
                        method: String(method).trim(),
                        category: String(category).trim(),
                        date: String(date).trim(),
                        reason: item.reason || null
                    });
                }
             });
        }

        if (cleanData.length > 0) {
          setRecords(cleanData);
        }
      }
    } catch (error) {
      console.warn('Network error checking for data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const checkHash = () => {
      if (window.location.hash === '#secret-admin-panel') {
        setViewConfig({ view: 'upload' });
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleNavigate = (view: any) => {
    setViewConfig({ view });
    window.scrollTo(0, 0);
    if (view === 'dashboard' && window.location.hash === '#secret-admin-panel') {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  };

  const handleMinistryClick = (ministryName: string) => {
    setViewConfig({ view: 'ministry_detail', ministryName });
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
      
      {viewConfig.view === 'ministry_detail' && viewConfig.ministryName && (
        <MinistryDetail 
          ministryName={viewConfig.ministryName} 
          records={records}
          onBack={() => handleNavigate('ministry_list')}
        />
      )}

      {viewConfig.view === 'ministry_list' && (
        <MinistryList 
            records={records} 
            onSelectMinistry={handleMinistryClick} 
        />
      )}

      {viewConfig.view === 'vendor_list' && (
        <VendorList records={records} />
      )}

      {viewConfig.view === 'upload' && (
        <Upload onDataLoaded={handleDataLoaded} />
      )}
      
      {viewConfig.view === 'about' && (
        <About />
      )}
    </Layout>
  );
}

export default App;