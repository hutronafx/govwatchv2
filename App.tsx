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
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setRecords(data);
        }
      } else {
        // File doesn't exist yet (first run), just use empty state
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
    // Checks the URL hash to see if the user is trying to access the admin panel
    const checkHash = () => {
      if (window.location.hash === '#secret-admin-panel') {
        setViewConfig({ view: 'upload' });
      }
    };

    // Check on load
    checkHash();

    // Check on hash change (if user types it in after loading)
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleNavigate = (view: 'dashboard' | 'upload') => {
    setViewConfig({ view });
    window.scrollTo(0, 0);
    // Clear hash if leaving upload
    if (view === 'dashboard' && window.location.hash === '#secret-admin-panel') {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  };

  const handleMinistryClick = (ministryName: string) => {
    setViewConfig({ view: 'ministry', ministryName });
    window.scrollTo(0, 0);
  };

  const handleDataLoaded = (newRecords: Record[]) => {
    // When upload finishes, update state and go to dashboard
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