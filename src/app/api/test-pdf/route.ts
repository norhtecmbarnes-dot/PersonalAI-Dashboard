export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const pdfParse = require('pdf-parse');

    const testPdfs = [
      path.join(process.cwd(), 'test.pdf'),
      path.join(process.cwd(), 'data', 'test.pdf'),
      path.join(process.cwd(), 'public', 'test.pdf'),
    ];

    const results: any[] = [];

    for (const pdfPath of testPdfs) {
      if (fs.existsSync(pdfPath)) {
        try {
          const buffer = fs.readFileSync(pdfPath);
          const data = await pdfParse(buffer);

          results.push({
            path: pdfPath,
            success: true,
            text_length: data.text?.length || 0,
            text_preview: data.text?.substring(0, 200),
            total_pages: data.numpages,
            info: data.info,
          });
        } catch (e) {
          results.push({
            path: pdfPath,
            success: false,
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      pdf_parse_version: require('../../node_modules/pdf-parse/package.json').version,
      test_pdfs_found: results.length,
      results,
      cwd: process.cwd(),
      checked_paths: testPdfs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
