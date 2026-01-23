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
  
  let browser;
  try {
    // LAUNCH BROWSER IN STEALTH MODE
    browser = await puppeteer.launch({
      headless: "new", 
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', 
          '--single-process',
          '--disable-blink-features=AutomationControlled', // CRITICAL: Hides "controlled by automation" flag
          '--window-size=1920,1080',
          '--disable-infobars',
          '--disable-features=IsolateOrigins,site-per-process' 
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });
    
    const page = await browser.newPage();
    
    // 1. Extra Stealth: Mask WebDriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // 2. Set Realistic Viewport & User Agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`Navigating to ${TARGET_URL}...`);
    
    // 3. Navigation with loose requirements (don't wait for networkidle strictly, it can hang on gov sites)
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    console.log('Page loaded. Waiting for table data...');
    
    // 4. Robust Waiting Strategy
    // Wait a fixed time for JS framework to initialize (SPA behavior)
    await new Promise(r => setTimeout(r, 5000));
    
    // Wait specifically for the table rows to appear
    try {
        await page.waitForSelector('table tbody tr', { timeout: 45000, visible: true });
    } catch (e) {
        console.error("Timeout waiting for table. Site might be slow or blocking.");
        throw new Error("Table selector not found - site might be blocking or structure changed.");
    }

    let allRecords = [];
    let hasNextPage = true;
    let pageNum = 1;
    const MAX_PAGES = 5; // Safety limit to prevent timeouts during this demo

    while (hasNextPage && pageNum <= MAX_PAGES) {
        console.log(`Scraping page ${pageNum}...`);
        
        // 5. Data Extraction
        // Using textContent is often faster/safer than innerText in headless
        const pageData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr'));
            const results = [];
            
            rows.forEach((row) => {
                const cols = row.querySelectorAll('td');
                // Check if it's a "No data" row or invalid
                if (cols.length < 4) return; 

                const getText = (col) => col ? col.textContent.trim() : "";
                
                const dateStr = getText(cols[0]);
                const ministryStr = getText(cols[1]);
                const vendorStr = getText(cols[2]);
                const amountStr = getText(cols[3]);
                const methodStr = getText(cols[4]);

                // Basic validation to ensure we aren't scraping headers
                if (ministryStr === "Ministry" || vendorStr === "Vendor") return;

                const parseAmount = (str) => {
                    if (!str) return 0;
                    return parseFloat(str.replace(/[^0-9.-]+/g, ""));
                };

                results.push({
                    date: dateStr || new Date().toISOString().split('T')[0],
                    ministry: ministryStr || "Unknown",
                    vendor: vendorStr || "Unknown",
                    amount: parseAmount(amountStr),
                    method: methodStr || "Unknown",
                });
            });
            return results;
        });

        if (pageData.length > 0) {
            allRecords = [...allRecords, ...pageData];
            console.log(`  Found ${pageData.length} records on page ${pageNum}.`);
        } else {
            console.log(`  No records found on page ${pageNum}.`);
        }

        // 6. Pagination Logic
        // Look for common "Next" buttons. MyProcurement likely uses standard Bootstrap/DataTables.
        // We try multiple selectors to be safe.
        const nextButtonSelectors = [
            'li.next:not(.disabled) a', // Common Bootstrap
            '.paginate_button.next:not(.disabled)', // DataTables
            'button[aria-label="Next"]:not([disabled])', // Material UI / Aria
            'a[rel="next"]' // Standard HTML
        ];
        
        let nextButton = null;
        for (const selector of nextButtonSelectors) {
            nextButton = await page.$(selector);
            if (nextButton) {
                console.log(`  Found next button with selector: ${selector}`);
                break;
            }
        }
        
        if (nextButton) {
            try {
                // Scroll into view to ensure it's clickable
                await page.evaluate((btn) => btn.scrollIntoView(), nextButton);
                
                // Click and wait for table refresh
                await Promise.all([
                   nextButton.click(),
                   new Promise(r => setTimeout(r, 4000)) 
                ]);
                pageNum++;
            } catch (err) {
                console.warn("  Error clicking next button:", err);
                hasNextPage = false;
            }
        } else {
            console.log("  No next button found or disabled. End of list.");
            hasNextPage = false;
        }
    }

    // 7. Save Data
    if (allRecords.length > 0) {
        const finalData = allRecords.map((r, i) => ({ ...r, id: i + 1 }));
        
        const publicDir = path.dirname(OUTPUT_PATH);
        try { await fs.access(publicDir); } catch { await fs.mkdir(publicDir, { recursive: true }); }
        
        await fs.writeFile(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
        console.log(`[Success] Scraped total ${finalData.length} records. Saved to data.json`);
    } else {
        console.warn("[Warning] Scraper finished but found 0 records.");
    }

  } catch (error) {
    console.error('[Error] Scraping fatal error:', error);
    throw error; // Propagate error so the API knows it failed
  } finally {
    if (browser) await browser.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrape();
}

export { scrape };