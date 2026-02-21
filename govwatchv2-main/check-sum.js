import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const sum = await p.procurementRecord.aggregate({
        _sum: { amount: true },
        _count: { id: true }
    });
    console.log("DB Stats:", sum);

    const rawData = await p.procurementRecord.findMany({
        take: 10,
        orderBy: { amount: 'desc' }
    });
    console.log("Top 10 highest amounts in DB:", rawData.map(r => r.amount));

    // Let's also check how many are 0
    const zeroCount = await p.procurementRecord.count({ where: { amount: 0 } });
    console.log("Records with amount = 0:", zeroCount);
}

main().finally(() => p.$disconnect());
