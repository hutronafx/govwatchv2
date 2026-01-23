import express from 'express';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scrape } from './scraper.js'; 

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies (for file uploads) - Increased limit for large data files
app.use(express.json({ limit: '50mb' }));

// Middleware to log requests
app.use((req, res, next) => {
  if (req.url.endsWith('.js') || req.url.endsWith('.css')) {
    // skip noisy static file logs
  } else {
    console.log(`[Request] ${req.method} ${req.url}`);
  }
  next();
});

console.log('GovWatch Server: Hybrid Mode Active (Manual + Auto-Scraper)');

// 2. Serve Static Files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../dist')));

// 3. API: Save Data Endpoint (Manual Upload)
app.post('/api/update-data', (req, res) => {
  const newData = req.body;
  
  if (!Array.isArray(newData)) {
    return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
  }

  const publicDir = path.join(__dirname, '../public');
  const dataFile = path.join(publicDir, 'data.json');

  try {
    fs.writeFileSync(dataFile, JSON.stringify(newData, null, 2));
    console.log(`[Admin] Database manually updated with ${newData.length} records.`);
    res.json({ success: true, count: newData.length });
  } catch (err) {
    console.error('Error saving data file:', err);
    res.status(500).json({ error: 'Failed to write to disk' });
  }
});

// 4. API: Trigger Server-Side Scraper (One-Click Update)
app.post('/api/trigger-scrape', async (req, res) => {
  console.log('[Admin] Triggering server-side scraper...');
  try {
    // This runs the Puppeteer script on the server
    await scrape();
    
    // Read the newly created file to return the count
    const publicDir = path.join(__dirname, '../public');
    const dataFile = path.join(publicDir, 'data.json');
    
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
      res.json({ success: true, count: data.length, message: 'Scrape completed successfully.' });
    } else {
      res.json({ success: true, count: 0, message: 'Scrape finished but no data file found.' });
    }
  } catch (error) {
    console.error('[Admin] Scraper failed:', error);
    res.status(500).json({ error: 'Scraper failed to execute. Check server logs.' });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Handle React Routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Error serving index.html:", err);
      res.status(500).send("Server Error: Could not load application.");
    }
  });
});

// Ensure data file exists
const initDataFile = () => {
  const publicDir = path.join(__dirname, '../public');
  const dataFile = path.join(publicDir, 'data.json');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]');
  }
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initDataFile();
  console.log('System ready.');
});