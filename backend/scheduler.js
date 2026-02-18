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
const COUNTER_NAMESPACE = 'govwatch-my-v3'; // Changed namespace to v3 to ensure clean start with new provider
const COUNTER_KEY = 'visits';

app.use(express.json({ limit: '50mb' }));

// Static
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../dist')));

// Serve Debug Logs
app.use('/debug_logs', express.static(path.join(__dirname, '../public/debug_logs')));

// --- PERSISTENCE HELPER ---
// Uses a free external counter API to persist data across deployments
// Switched to counterapi.dev as it is often more reliable for simple counting
async function getPersistentCount(increment = false) {
    try {
        const baseUrl = 'https://api.counterapi.dev/v1';
        const url = increment 
            ? `${baseUrl}/${COUNTER_NAMESPACE}/${COUNTER_KEY}/up`
            : `${baseUrl}/${COUNTER_NAMESPACE}/${COUNTER_KEY}`;
        
        // Note: fetch is available globally in Node 18+
        const res = await fetch(url);
        
        if (!res.ok) {
            // If key/namespace doesn't exist, counterapi.dev might return 400 or 404 on GET
            // On increment (up), it usually auto-creates.
            if ((res.status === 404 || res.status === 400) && !increment) {
                return 0;
            }
            // If we try to increment and it fails, we throw to trigger fallback
            throw new Error(`API Error: ${res.status}`);
        }
        
        const data = await res.json();
        return data.count || 0;
    } catch (e) {
        console.warn('External persistence warning:', e.message);
        // Return null to indicate failure so we can use local fallback
        return null;
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
  let count = BASELINE_VIEWS;
  
  // 1. Try External Persistence
  const externalCount = await getPersistentCount(false);
  
  if (externalCount !== null) {
      count += externalCount;
  } else {
      // 2. Fallback to Local File (if external fails)
      // This is useful if the external API is down but we have a local count in the ephemeral FS
      try {
          const VIEWS_FILE = path.join(__dirname, '../public/views.json');
          if (fs.existsSync(VIEWS_FILE)) {
              const data = JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf-8'));
              if (data.count > count) count = data.count;
          }
      } catch (e) { /* ignore */ }
  }
  
  res.json({ count });
});

app.post('/api/visit', async (req, res) => {
  let count = BASELINE_VIEWS;
  let externalSuccess = false;

  // 1. Increment External
  const externalCount = await getPersistentCount(true);
  
  if (externalCount !== null) {
      count += externalCount;
      externalSuccess = true;
  } else {
      // Fallback: Read local, increment, return
      try {
          const VIEWS_FILE = path.join(__dirname, '../public/views.json');
          if (fs.existsSync(VIEWS_FILE)) {
              const data = JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf-8'));
              if (data.count > count) count = data.count;
          }
      } catch (e) { /* ignore */ }
      
      // Manually increment since external failed
      count++;
  }

  // 2. Always write to local file as backup/cache for this session
  try {
      const VIEWS_FILE = path.join(__dirname, '../public/views.json');
      fs.writeFileSync(VIEWS_FILE, JSON.stringify({ count }));
  } catch (e) { /* ignore write error on ephemeral fs */ }

  res.json({ count });
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