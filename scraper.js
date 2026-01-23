/**
 * GOVWATCH DATA SCRAPER
 * ---------------------
 * Instructions:
 * 1. Open https://myprocurement.treasury.gov.my/results/tender in your browser.
 * 2. Ensure the table is visible (you may need to select "Show All" or paginate).
 * 3. Open Developer Tools (Press F12 or Right Click > Inspect > Console).
 * 4. Paste this entire script into the Console and press Enter.
 * 5. The data will download as 'govwatch_data.json'.
 * 6. Upload this file to the GovWatch App.
 */

(function() {
  const rows = document.querySelectorAll('table tbody tr');
  const data = [];
  
  // Helper to clean currency strings (e.g., "RM 1,234.50" -> 1234.50)
  const parseAmount = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/[^0-9.-]+/g, ""));
  };

  console.log(`Found ${rows.length} rows. Processing...`);

  rows.forEach((row, index) => {
    const cols = row.querySelectorAll('td');
    if (cols.length < 4) return;

    // NOTE: Adjust indices [0], [1], etc based on the specific column order of the target website table
    // Assuming standard layout: Date | Ministry | Vendor | Amount | Method
    // You may need to inspect the table headers to match these indices.
    
    const record = {
      id: index + 1,
      // Fallback logic tries to grab text safely
      date: cols[0]?.innerText?.trim() || new Date().toISOString().split('T')[0],
      ministry: cols[1]?.innerText?.trim() || "Unknown Ministry",
      vendor: cols[2]?.innerText?.trim() || "Unknown Vendor",
      amount: parseAmount(cols[3]?.innerText), 
      method: cols[4]?.innerText?.trim() || "Open Tender", // Default if missing
      reason: null
    };

    data.push(record);
  });

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'govwatch_data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log(`Successfully scraped ${data.length} records! File downloading...`);
})();
