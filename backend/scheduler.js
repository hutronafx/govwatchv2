import express from 'express';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scrape } from './scraper.js'; 

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  if (!req.url.endsWith('.js') && !req.url.endsWith('.css')) {
    console.log(`[Request] ${req.method} ${req.url}`);
  }
  next();
});

console.log('GovWatch Server: Hybrid Mode Active');

// Static
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../dist')));

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

// API: Trigger Scraper (Robust)
app.post('/api/trigger-scrape', async (req, res) => {
  console.log('[Admin] Triggering server-side scraper...');
  try {
    // IMPORTANT: Await the scrape so we catch errors here, preventing server crash
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
    // Return 200 with error message so frontend can handle it without generic 500
    res.json({ success: false, message: 'Scraper failed internally. Check server logs.' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Init Data File
const init = () => {
  const f = path.join(__dirname, '../public/data.json');
  if (!fs.existsSync(f)) {
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, '[]');
  }
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  init();
});