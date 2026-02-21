import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const totals = await p.procurementRecord.aggregate({ _sum: { amount: true }, _count: { id: true } });
    const cats = await p.procurementRecord.groupBy({ by: ['category'], _sum: { amount: true }, _count: { id: true }, orderBy: { _sum: { amount: 'desc' } } });
    const methods = await p.procurementRecord.groupBy({ by: ['method'], _sum: { amount: true }, _count: { id: true }, orderBy: { _sum: { amount: 'desc' } } });

    const result = { totals, categories: cats, methods };

    // Also fetch the API
    const apiRes = await fetch('http://localhost:3000/api/stats/dashboard');
    const apiData = await apiRes.json();

    const fs = await import('fs');
    fs.writeFileSync('debug-output.json', JSON.stringify({ db: result, api: apiData }, null, 2));
    console.log("Written to debug-output.json");
}

main().catch(console.error).finally(() => p.$disconnect());
