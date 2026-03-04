import { NextResponse } from 'next/server';

export async function GET() {
  const ONLYOFFICE_URL = process.env.NEXT_PUBLIC_ONLYOFFICE_URL || 'http://localhost:8080';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${ONLYOFFICE_URL}/welcome`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (res.ok) {
      return NextResponse.json({ 
        running: true, 
        message: 'ONLYOFFICE Document Server is running',
        url: ONLYOFFICE_URL 
      });
    } else {
      return NextResponse.json({ 
        running: false, 
        message: `ONLYOFFICE returned status ${res.status}`,
        url: ONLYOFFICE_URL 
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({ 
      running: false, 
      message: 'Cannot connect to ONLYOFFICE',
      error: errorMessage,
      url: ONLYOFFICE_URL,
      diagnostics: {
        dockerCheck: 'Failed to connect to ' + ONLYOFFICE_URL,
        possibleCauses: [
          'Docker Desktop is not running',
          'ONLYOFFICE container is not started',
          'Port 8080 is blocked or in use',
          'Firewall is blocking the connection'
        ],
        solutions: [
          '1. Start Docker Desktop',
          '2. Run: docker run -d -p 8080:80 --name onlyoffice onlyoffice/documentserver',
          '3. Or run: .\\scripts\\start-onlyoffice.bat',
          '4. Check if port 8080 is available: netstat -ano | findstr 8080'
        ]
      }
    }, { status: 503 });
  }
}