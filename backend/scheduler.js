import express from 'express';
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