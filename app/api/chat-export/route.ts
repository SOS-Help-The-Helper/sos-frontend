import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const personId = url.searchParams.get('personId');
  if (!personId) return NextResponse.json({ error: 'Missing personId' }, { status: 400 });

  const { data } = await supabase
    .from('chat_sessions')
    .select('messages, created_at, updated_at')
    .eq('person_id', personId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (!data?.messages) return NextResponse.json({ error: 'No chat history' }, { status: 404 });

  const lines = (data.messages as any[]).map((m: any) => {
    const role = m.role === 'user' ? 'You' : 'SOS';
    const text = m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '';
    const time = m.createdAt ? new Date(m.createdAt).toLocaleString() : '';
    return `[${time}] ${role}: ${text}`;
  }).filter((l: string) => !l.endsWith(': '));

  const exportText = `SOS Connect — Chat Export\nExported: ${new Date().toISOString()}\n\n${lines.join('\n\n')}`;

  return new NextResponse(exportText, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="sos-chat-${new Date().toISOString().slice(0,10)}.txt"`,
    },
  });
}
