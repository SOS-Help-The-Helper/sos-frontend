import { db } from '@/lib/api';
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPersonId } from '@/lib/person-cookie';

interface Message {
  id: string;
  person_id: string;
  message_text: string;
  message_type: string;
  created_at: string;
}

function CaravanChatContent() {
  const router = useRouter();
  const params = useSearchParams();
  const runId = params.get('run');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [runName, setRunName] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const personId = typeof window !== 'undefined' ? getPersonId() : null;

  // Load messages scoped to run_id
  useEffect(() => {
    if (!runId) { setLoading(false); return; }
    async function load() {
      // Get run info
      const { data: runData } = await db.from('delivery_runs').select('name, total_slots').eq('id', runId).single();
      if (runData) { setRunName(runData.name); setMemberCount(runData.total_slots || 0); }

      // Get messages for this run — stored in community_messages with run_id in JSONB or a dedicated column
      // Using a convention: community_messages where message_type starts with 'caravan_' and message includes run_id
      // Better: query by a filter. For now, use a tag approach.
      const { data } = await supabase
        .from('community_messages')
        .select('id, person_id, message_text, message_type, created_at')
        .eq('message_type', `caravan_${runId}`)
        .order('created_at', { ascending: true })
        .limit(200);

      setMessages(data || []);
      setLoading(false);
    }
    load();
  }, [runId]);

  // Realtime
  useEffect(() => {
    if (!runId) return;
    const channel = supabase
      .channel(`caravan-${runId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.message_type === `caravan_${runId}`) {
            setMessages(prev => [...prev, msg]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [runId]);

  useEffect(() => {
    if (!loading) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || !runId) return;
    setSending(true);

    const { data } = await db.from('community_messages').insert({
      person_id: personId,
      message_text: input.trim(),
      message_type: `caravan_${runId}`,
      latitude: 0,
      longitude: 0,
      community_radius_km: 0,
    }).select().single();

    if (data) {
      setMessages(prev => [...prev, data]);
      setInput('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setSending(false);
  }

  function timeSince(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  }

  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/drive?run=${runId}`)} className="text-white/40 hover:text-white">←</button>
            <div>
              <p className="text-sm font-bold">💬 Caravan Chat</p>
              <p className="text-[10px] text-white/40">{runName || 'Delivery Run'} · {memberCount} drivers</p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-3xl">🚐</span>
            <p className="text-sm font-bold mt-2">Caravan chat is empty</p>
            <p className="text-xs text-white/40 mt-1">Messages here are only visible to drivers in this run.</p>
          </div>
        ) : messages.map(msg => {
          const isOwn = msg.person_id === personId;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                isOwn ? 'bg-sos-accent-600 text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'
              }`}>
                <p className="text-sm leading-relaxed">{msg.message_text}</p>
                <p className={`text-[9px] mt-1 ${isOwn ? 'text-white/40' : 'text-white/20'}`}>{timeSince(msg.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] border-t border-white/10">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Message your caravan..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-sos-accent-400" />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-sos-accent-600 text-white flex items-center justify-center hover:bg-sos-accent-500 disabled:opacity-30 transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CaravanChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0F1E2B]"><div className="w-8 h-8 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <CaravanChatContent />
    </Suspense>
  );
}
