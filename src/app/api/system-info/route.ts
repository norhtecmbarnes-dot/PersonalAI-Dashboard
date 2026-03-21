import { NextResponse } from 'next/server';
import * as os from 'os';

export async function GET() {
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Get process memory (Node.js)
    const processMemory = process.memoryUsage();

    return NextResponse.json({
      success: true,
      system: {
        totalMB: Math.round(totalMemory / 1024 / 1024),
        usedMB: Math.round(usedMemory / 1024 / 1024),
        freeMB: Math.round(freeMemory / 1024 / 1024),
        usagePercent: Math.round((usedMemory / totalMemory) * 100),
      },
      process: {
        heapUsedMB: Math.round(processMemory.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(processMemory.heapTotal / 1024 / 1024),
        residentSetMB: Math.round(processMemory.rss / 1024 / 1024),
        externalMB: Math.round(processMemory.external / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get system info' }, { status: 500 });
  }
}
