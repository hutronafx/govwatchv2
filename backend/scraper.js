import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const TARGET_URL = 'https://myprocurement.treasury.gov.my/results/tender';
const OUTPUT_PATH = path.resolve(__dirname, '../public/data.json');

async function scrape() {
  console.log(`[${new Date().toISOString()}] Starting scraping job...`);
  
  // Launch config for Server Environment
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // critical for low-memory server environments
        '--single-process' // critical for some server environments
    ]
  });
  
  const page = await browser.newPage();
  
  // Set a real User Agent so the government site doesn't block the "robot"
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    console.log('Navigating to site...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Waiting for table data...');
    // Increase timeout for slow government servers
    await page.waitForSelector('table tbody tr', { timeout: 45000 });

    let allRecords = [];
    let hasNextPage = true;
    let pageNum = 1;

    // LIMITER: Only scrape first 5 pages to prevent server timeout during initial test
    // You can remove (pageNum > 5) to scrape everything later.
    while (hasNextPage && pageNum <= 5) {
        console.log(`Scraping page ${pageNum}...`);

        const pageData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr'));
            return rows.map((row) => {
                const cols = row.querySelectorAll('td');
                if (cols.length < 5) return null;

                const parseAmount = (str) => {
                    if (!str) return 0;
                    return parseFloat(str.replace(/[^0-9.-]+/g, ""));
                };

                return {
                    date: cols[0]?.innerText?.trim() || new Date().toISOString().split('T')[0],
                    ministry: cols[1]?.innerText?.trim() || "Unknown",
                    vendor: cols[2]?.innerText?.trim() || "Unknown",
                    amount: parseAmount(cols[3]?.innerText),
                    method: cols[4]?.innerText?.trim() || "Unknown",
                };
            }).filter(r => r !== null);
        });

        allRecords = [...allRecords, ...pageData];

        // Pagination Logic
        const nextButton = await page.$('li.next:not(.disabled) a, button[aria-label="Next"]:not([disabled])');
        
        if (nextButton) {
            await nextButton.click();
            // Wait for the table to update (loading state usually appears)
            await new Promise(r => setTimeout(r, 3000));
            pageNum++;
        } else {
            hasNextPage = false;
        }
    }

    // Post-process
    const finalData = allRecords.map((r, i) => ({ ...r, id: i + 1 }));

    // Ensure public directory exists
    const publicDir = path.dirname(OUTPUT_PATH);
    try { await fs.access(publicDir); } catch { await fs.mkdir(publicDir, { recursive: true }); }

    await fs.writeFile(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[Success] Scraped ${finalData.length} records. Saved to data.json`);

  } catch (error) {
    console.error('[Error] Scraping failed:', error);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrape();
}

export { scrape };
