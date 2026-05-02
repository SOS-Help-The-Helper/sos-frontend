import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const html = readFileSync(
      join(process.cwd(), 'public', 'what-is-sos.html'),
      'utf-8'
    );
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new NextResponse('Page not found', { status: 404 });
  }
}
