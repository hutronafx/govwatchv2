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

// Static
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../dist')));

// Serve Debug Logs
app.use('/debug_logs', express.static(path.join(__dirname, '../public/debug_logs')));

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
const VIEWS_FILE = path.join(__dirname, '../public/views.json');

app.get('/api/views', (req, res) => {
  try {
    if (fs.existsSync(VIEWS_FILE)) {
      const data = JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf-8'));
      res.json(data);
    } else {
      res.json({ count: 0 });
    }
  } catch (err) {
    console.error('View fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch views' });
  }
});

app.post('/api/visit', (req, res) => {
  try {
    let count = 0;
    if (fs.existsSync(VIEWS_FILE)) {
      const data = JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf-8'));
      count = data.count || 0;
    }
    count++;
    fs.writeFileSync(VIEWS_FILE, JSON.stringify({ count }));
    res.json({ count });
  } catch (err) {
    console.error('View update error:', err);
    res.status(500).json({ error: 'Failed to update views' });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});