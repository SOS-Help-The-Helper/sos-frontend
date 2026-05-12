import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// GET: load chat history for a person
export async function GET(req: Request) {
  const url = new URL(req.url);
  const personId = url.searchParams.get('personId');
  if (!personId) return NextResponse.json({ messages: [] });

  const { data } = await supabase
    .from('chat_sessions')
    .select('messages, updated_at')
    .eq('person_id', personId)
    .eq('agent_type', 'citizen')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ messages: data?.messages || [] });
}

// POST: save chat messages for a person
export async function POST(req: Request) {
  const { personId, messages } = await req.json();
  if (!personId || !messages) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  // Upsert — update existing or create new
  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('person_id', personId)
    .eq('agent_type', 'citizen')
    .limit(1)
    .single();

  if (existing) {
    await supabase.from('chat_sessions').update({ messages, updated_at: new Date().toISOString() }).eq('id', existing.id);
  } else {
    await supabase.from('chat_sessions').insert({ person_id: personId, agent_type: 'citizen', messages });
  }

  // P1 Fix 6: Write signal trace for significant actions
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.parts?.some((p: any) => p.type === 'tool-invocation' && p.toolInvocation?.state === 'result')) {
    await supabase.from('signal_traces').insert({
      entity_type: 'web_chat',
      signal_layer: 'I',
      trace_type: 'web_agent_action',
      reasoning: `Web agent completed tool action for person ${personId}`,
      agent_id: 'web-citizen',
      metadata: { person_id: personId, message_count: messages.length },
    });
  }

  return NextResponse.json({ ok: true });
}
