import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scrape } from './scraper.js';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(express.json({ limit: '50mb' }));

// Static
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../dist')));

// Serve Debug Logs
app.use('/debug_logs', express.static(path.join(__dirname, '../public/debug_logs')));

// API: Server-Side Pagination
app.get('/api/records', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const ministry = req.query.ministry;
    const vendor = req.query.vendor;
    const category = req.query.category;
    const method = req.query.method;
    const sortBy = req.query.sortBy || 'date'; // 'date' | 'value'

    const skip = (page - 1) * limit;

    const where = {};
    if (ministry) where.ministry = ministry;
    if (vendor) where.vendor = vendor;
    if (category && category !== 'All') where.category = { contains: category, mode: 'insensitive' };
    if (method && method !== 'All') {
      if (method === 'Direct Negotiation') {
        where.method = { contains: 'direct', mode: 'insensitive' };
      } else if (method === 'Open Tender') {
        where.method = { contains: 'open', mode: 'insensitive' };
      } else {
        where.method = { contains: method, mode: 'insensitive' };
      }
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { ministry: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [data, totalCount] = await Promise.all([
      prisma.procurementRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy === 'value' ? { amount: 'desc' } : { date: 'desc' }
      }),
      prisma.procurementRecord.count({ where })
    ]);

    res.json({
      data,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Helper: normalize ministry names to merge duplicates like "KEMENTERIAN PENDIDIKAN" / "KEMENTERIAN PENDIDIKAN MALAYSIA"
function normalizeMinistry(raw) {
  let n = raw.toUpperCase().trim();
  // Strip trailing " MALAYSIA"
  if (n.endsWith(' MALAYSIA')) n = n.slice(0, -9).trim();
  return n;
}

// API: Dashboard Aggregations
app.get('/api/stats/dashboard', async (req, res) => {
  try {
    const aggregations = await prisma.procurementRecord.aggregate({
      _sum: { amount: true },
      _count: { id: true }
    });

    const worksAgg = await prisma.procurementRecord.aggregate({
      _sum: { amount: true },
      where: { category: { contains: 'Kerja', mode: 'insensitive' } }
    });

    // Supplies = Bekalan
    const suppliesAgg = await prisma.procurementRecord.aggregate({
      _sum: { amount: true },
      where: { category: { contains: 'Bekalan', mode: 'insensitive' } }
    });

    // Services = everything that is NOT Kerja and NOT Bekalan
    // This captures: Perkhidmatan Bukan Perunding, Perkhidmatan Perunding, Bukan Perunding, etc.
    const servicesAgg = await prisma.procurementRecord.aggregate({
      _sum: { amount: true },
      where: {
        AND: [
          { NOT: { category: { contains: 'Kerja', mode: 'insensitive' } } },
          { NOT: { category: { contains: 'Bekalan', mode: 'insensitive' } } }
        ]
      }
    });

    // Supplies & Services combined for the KPI card
    const suppliesAndServicesSpend = (suppliesAgg._sum.amount || 0) + (servicesAgg._sum.amount || 0);

    // Top Ministries — fetch more to account for merging, then normalize and group
    const rawMinistries = await prisma.procurementRecord.groupBy({
      by: ['ministry'],
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 30
    });

    // Merge duplicates by normalized name
    const mergedMap = new Map();
    for (const m of rawMinistries) {
      const key = normalizeMinistry(m.ministry);
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.totalSpend += (m._sum.amount || 0);
        existing.contractCount += (m._count.id || 0);
      } else {
        mergedMap.set(key, {
          name: key,
          totalSpend: m._sum.amount || 0,
          contractCount: m._count.id || 0
        });
      }
    }

    // Sort merged results and take top 8
    const topMinistries = [...mergedMap.values()]
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 8);

    res.json({
      totalSpend: aggregations._sum.amount || 0,
      totalContracts: aggregations._count.id || 0,
      worksSpend: worksAgg._sum.amount || 0,
      suppliesSpend: suppliesAgg._sum.amount || 0,
      servicesSpend: servicesAgg._sum.amount || 0,
      suppliesAndServicesSpend,
      topMinistries
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// API: Vendors Aggregation
app.get('/api/vendors', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';

    const where = search ? { vendor: { contains: search, mode: 'insensitive' } } : {};

    // Prisma groupBy doesn't directly return total row count of groups, so we query distinct vendors
    const distinctVendors = await prisma.procurementRecord.findMany({
      where,
      select: { vendor: true },
      distinct: ['vendor']
    });

    const totalCount = distinctVendors.length;

    const vendors = await prisma.procurementRecord.groupBy({
      by: ['vendor'],
      where,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      skip: (page - 1) * limit,
      take: limit
    });

    res.json({
      data: vendors.map(v => ({
        name: v.vendor,
        totalSpend: v._sum.amount || 0,
        contractCount: v._count.id || 0
      })),
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// API: Vendor Stats
app.get('/api/vendors/:name/stats', async (req, res) => {
  try {
    const name = req.params.name;
    const [overall, byMinistry] = await Promise.all([
      prisma.procurementRecord.aggregate({
        where: { vendor: name },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.procurementRecord.groupBy({
        by: ['ministry'],
        where: { vendor: name },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } }
      })
    ]);

    res.json({
      totalSpend: overall._sum.amount || 0,
      contractCount: overall._count.id || 0,
      byMinistry: byMinistry.map(m => ({
        name: m.ministry,
        totalSpend: m._sum.amount || 0,
        contractCount: m._count.id || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor stats' });
  }
});

// API: Ministries Aggregation
app.get('/api/ministries', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';

    const where = search ? { ministry: { contains: search, mode: 'insensitive' } } : {};

    const distinct = await prisma.procurementRecord.findMany({
      where,
      select: { ministry: true },
      distinct: ['ministry']
    });

    const totalCount = distinct.length;

    const ministries = await prisma.procurementRecord.groupBy({
      by: ['ministry'],
      where,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      skip: (page - 1) * limit,
      take: limit
    });

    res.json({
      data: ministries.map(v => ({
        name: v.ministry,
        totalSpend: v._sum.amount || 0,
        contractCount: v._count.id || 0
      })),
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ministries' });
  }
});

// API: Ministry Stats
app.get('/api/ministries/:name/stats', async (req, res) => {
  try {
    const name = req.params.name;
    const [overall, byMethod, topVendors] = await Promise.all([
      prisma.procurementRecord.aggregate({
        where: { ministry: name },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.procurementRecord.groupBy({
        by: ['method'],
        where: { ministry: name },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } }
      }),
      prisma.procurementRecord.groupBy({
        by: ['vendor'],
        where: { ministry: name },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5
      })
    ]);

    res.json({
      totalSpend: overall._sum.amount || 0,
      contractCount: overall._count.id || 0,
      byMethod: byMethod.map(m => ({
        name: m.method,
        totalSpend: m._sum.amount || 0,
        contractCount: m._count.id || 0
      })),
      topVendors: topVendors.map(v => ({
        name: v.vendor,
        totalSpend: v._sum.amount || 0,
        contractCount: v._count.id || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ministry stats' });
  }
});

// API: Manual Update
app.post('/api/update-data', async (req, res) => {
  const newData = req.body;
  if (!Array.isArray(newData)) return res.status(400).json({ error: 'Invalid data' });

  // Use the scraper function manually exported logic
  try {
    let addedCount = 0;
    for (const r of newData) {
      const existing = await prisma.procurementRecord.findFirst({
        where: { vendor: r.vendor, amount: r.amount, ministry: r.ministry }
      });
      if (!existing) {
        await prisma.procurementRecord.create({
          data: {
            ministry: r.ministry || "Unknown",
            vendor: r.vendor || "Unknown",
            amount: parseFloat(r.amount) || 0,
            method: r.method || "Unknown",
            category: r.category || "General",
            date: r.date ? new Date(r.date) : new Date(),
            title: r.title || "No Title",
            sourceUrl: r.sourceUrl || "Manual Upload"
          }
        });
        addedCount++;
      }
    }
    res.json({ success: true, count: addedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert to db' });
  }
});

// API: Trigger Scraper
app.post('/api/trigger-scrape', async (req, res) => {
  console.log('[Admin] Triggering server-side scraper...');
  try {
    await scrape();

    const count = await prisma.procurementRecord.count();
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