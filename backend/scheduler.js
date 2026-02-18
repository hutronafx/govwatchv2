import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scrape } from './scraper.js'; 

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// BASELINE: The estimated count before we added persistence.
// We add the persistent counter value to this number.
const BASELINE_VIEWS = 1450; 
const COUNTER_NAMESPACE = 'govwatch-my-v2'; // Unique namespace for this app
const COUNTER_KEY = 'visits';

app.use(express.json({ limit: '50mb' }));

// Static
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../dist')));

// Serve Debug Logs
app.use('/debug_logs', express.static(path.join(__dirname, '../public/debug_logs')));

// --- PERSISTENCE HELPER ---
// Uses a free external counter API to persist data across deployments
async function getPersistentCount(increment = false) {
    try {
        const endpoint = increment ? 'hit' : 'get';
        const url = `https://api.countapi.xyz/${endpoint}/${COUNTER_NAMESPACE}/${COUNTER_KEY}`;
        
        // Note: fetch is available globally in Node 18+
        const res = await fetch(url);
        
        if (res.status === 404 && !increment) {
            // Key doesn't exist yet, return 0
            return 0;
        }
        
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        
        const data = await res.json();
        return data.value || 0;
    } catch (e) {
        console.warn('External persistence warning:', e.message);
        // Fallback: If API fails, we return 0 so we at least show the baseline
        return 0;
    }
}

// API: Manual Update
app.post('/api/update-data', (req, res) => {
  const newData = req.body;
  if (!Array.isArray(newData)) return res.status(400).json({ error: 'Invalid data' });

  const dataFile = path.join(__dirname, '../public/data.json');
  try {
    fs.writeFileSync(dataFile, JSON.stringify(newData, null, 2));
    res.json({ success: true, count: newData.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write to disk' });
  }
});

// API: View Tracker
app.get('/api/views', async (req, res) => {
  try {
    // Get external count (persistent)
    const externalCount = await getPersistentCount(false);
    
    // Total = Baseline + New Persistent Visits
    const totalCount = BASELINE_VIEWS + externalCount;
    
    res.json({ count: totalCount });
  } catch (err) {
    console.error('View fetch error:', err);
    res.json({ count: BASELINE_VIEWS });
  }
});

app.post('/api/visit', async (req, res) => {
  try {
    // Increment external count
    const externalCount = await getPersistentCount(true);
    
    const totalCount = BASELINE_VIEWS + externalCount;
    
    // We also write to local file as a backup/cache for this session
    try {
        const VIEWS_FILE = path.join(__dirname, '../public/views.json');
        fs.writeFileSync(VIEWS_FILE, JSON.stringify({ count: totalCount }));
    } catch (e) { /* ignore write error on ephemeral fs */ }

    res.json({ count: totalCount });
  } catch (err) {
    console.error('View update error:', err);
    res.json({ count: BASELINE_VIEWS });
  }
});

// API: Trigger Scraper
app.post('/api/trigger-scrape', async (req, res) => {
  console.log('[Admin] Triggering server-side scraper...');
  try {
    await scrape(); 
    
    // Check results
    const dataFile = path.join(__dirname, '../public/data.json');
    let count = 0;
    if (fs.existsSync(dataFile)) {
       const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
       count = data.length;
    }
    
    res.json({ success: true, count, message: 'Scrape completed.' });
  } catch (error) {
    console.error('[Admin] Scraper execution failed:', error);
    res.json({ success: false, message: 'Scraper failed internally. Check debug logs.' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Bind to 0.0.0.0 to ensure Railway can map the port correctly
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});