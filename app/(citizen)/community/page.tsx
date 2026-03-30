'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const RATE_LIMIT = 20; // per hour

interface Message {
  id: string;
  person_id: string;
  message_text: string;
  message_type: string; // chat, report, agent_response, photo
  photo_url: string | null;
  photo_analysis: any;
  flagged: boolean;
  created_at: string;
}

export default function CommunityChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [helperCount, setHelperCount] = useState(0);
  const [messagesThisHour, setMessagesThisHour] = useState(0);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  // GPS
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      p => { setLat(p.coords.latitude); setLng(p.coords.longitude); },
      () => { setLat(35.5951); setLng(-82.5515); }, // default Asheville
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Load messages — bounding box filter (~8km)
  useEffect(() => {
    if (!lat) return;
    async function load() {
      const delta = 0.072; // ~8km in degrees
      const { data } = await supabase
        .from('community_messages')
        .select('id, person_id, message_text, message_type, photo_url, photo_analysis, flagged, created_at')
        .gte('latitude', lat - delta)
        .lte('latitude', lat + delta)
        .gte('longitude', lng - delta)
        .lte('longitude', lng + delta)
        .order('created_at', { ascending: true })
        .limit(100);

      setMessages(data || []);

      // Counts
      const { count: mc } = await supabase.from('persons').select('id', { count: 'exact', head: true });
      const { count: hc } = await supabase.from('resources').select('id', { count: 'exact', head: true }).eq('source', 'citizen_offer');
      setMemberCount(mc || 0);
      setHelperCount(hc || 0);

      // Rate limit check
      if (personId) {
        const hourAgo = new Date(Date.now() - 3600000).toISOString();
        const { count } = await supabase
          .from('community_messages')
          .select('id', { count: 'exact', head: true })
          .eq('person_id', personId)
          .gte('created_at', hourAgo);
        setMessagesThisHour(count || 0);
      }

      setLoading(false);
    }
    load();
  }, [lat, lng, personId]);

  // Realtime subscription
  useEffect(() => {
    if (!lat) return;
    const channel = supabase
      .channel('community-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload) => {
          const msg = payload.new as Message;
          // Check if within range (approximate)
          setMessages(prev => [...prev, msg]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lat]);

  // Auto-scroll on load
  useEffect(() => {
    if (!loading) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [loading]);

  // Send message
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || messagesThisHour >= RATE_LIMIT) return;
    setSending(true);

    const hasAtSOS = input.includes('@SOS') || input.includes('@sos');
    const messageType = hasAtSOS ? 'report' : 'chat';

    const { data, error } = await supabase.from('community_messages').insert({
      person_id: personId,
      message_text: input.trim(),
      message_type: messageType,
      latitude: lat,
      longitude: lng,
      community_radius_km: 8,
    }).select().single();

    if (!error && data) {
      setMessages(prev => [...prev, data]);
      setMessagesThisHour(prev => prev + 1);
      setInput('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      // If @SOS, trigger agent response via EF
      if (hasAtSOS) {
        try {
          const agentRes = await fetch(`${SUPABASE_URL}/functions/v1/community-agent`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message_id: data.id,
              message_text: input.trim(),
              person_id: personId,
              latitude: lat,
              longitude: lng,
            }),
          });
          // Agent response is inserted server-side → arrives via Realtime
        } catch { /* agent will respond asynchronously */ }
      }
    }

    setSending(false);
  }

  // Photo upload (Task 38)
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !personId) return;
    setPhotoUploading(true);

    // Upload to Supabase Storage
    const fileName = `community/${personId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('community-photos')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) { setPhotoUploading(false); return; }

    const { data: urlData } = supabase.storage.from('community-photos').getPublicUrl(fileName);
    const photoUrl = urlData?.publicUrl;

    // Insert message with photo
    const { data: msgData } = await supabase.from('community_messages').insert({
      person_id: personId,
      message_text: '📷 Photo',
      message_type: 'photo',
      photo_url: photoUrl,
      latitude: lat,
      longitude: lng,
      community_radius_km: 8,
    }).select().single();

    if (msgData) {
      setMessages(prev => [...prev, msgData]);
      setMessagesThisHour(prev => prev + 1);

      // Call image-analyze EF for photo analysis
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/image-analyze`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: msgData.id, photo_url: photoUrl, latitude: lat, longitude: lng }),
        });
      } catch { /* analysis happens async */ }
    }

    setPhotoUploading(false);
  }

  // Report message (Task 40)
  async function handleReport(messageId: string, reason: string) {
    await supabase.from('community_messages').update({ flagged: true, flag_reason: reason }).eq('id', messageId);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, flagged: true } : m));
    setReportingId(null);
  }

  function timeSince(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  // Highlight @SOS in message text (Task 39)
  function renderMessageText(text: string) {
    const parts = text.split(/(@SOS|@sos)/gi);
    return parts.map((part, i) =>
      part.toLowerCase() === '@sos'
        ? <span key={i} className="font-bold text-sos-red-500 bg-sos-red-50 px-1 rounded">@SOS</span>
        : <span key={i}>{part}</span>
    );
  }

  const rateLimitPct = (messagesThisHour / RATE_LIMIT) * 100;
  const isOwnMessage = (msg: Message) => msg.person_id === personId;
  const isAgentMessage = (msg: Message) => msg.message_type === 'agent_response';

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-sos-blue-800 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/c')} className="text-white/60 hover:text-white">←</button>
            <div>
              <p className="text-sm font-bold">📢 Community</p>
              <p className="text-[10px] text-white/50">{memberCount} members · {helperCount} helpers</p>
            </div>
          </div>
          {/* Rate limit indicator */}
          <div className="text-right">
            <p className="text-[9px] text-white/40">{RATE_LIMIT - messagesThisHour} msgs left</p>
            <div className="w-12 h-1 bg-white/10 rounded-full mt-0.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${rateLimitPct > 80 ? 'bg-sos-red-400' : 'bg-green-400'}`} style={{ width: `${100 - rateLimitPct}%` }} />
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-3xl">📢</span>
            <p className="text-sm font-bold text-sos-blue-800 mt-2">No messages yet</p>
            <p className="text-xs text-sos-gray-500 mt-1">Be the first to post in your community!</p>
            <p className="text-[10px] text-sos-gray-400 mt-2">Type <span className="font-bold text-sos-red-500">@SOS</span> to ask the agent for help</p>
          </div>
        ) : messages.map(msg => (
          <div key={msg.id} className={`flex ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 relative group ${
              isAgentMessage(msg) ? 'bg-sos-blue-800 text-white rounded-bl-md' :
              isOwnMessage(msg) ? 'bg-sos-accent-500 text-white rounded-br-md' :
              'bg-white border border-sos-gray-300 text-sos-blue-800 rounded-bl-md'
            } ${msg.flagged ? 'opacity-50' : ''}`}>
              {/* Agent badge */}
              {isAgentMessage(msg) && (
                <div className="flex items-center gap-1 mb-1">
                  <img src="/logomark.svg" alt="SOS" className="h-3.5 w-3.5" />
                  <span className="text-[9px] font-bold text-white/60">SOS Agent</span>
                </div>
              )}

              {/* Photo */}
              {msg.photo_url && (
                <img src={msg.photo_url} alt="Community photo" className="rounded-lg mb-2 max-h-48 w-full object-cover" />
              )}

              {/* Photo analysis badge */}
              {msg.photo_analysis && (
                <div className="bg-black/20 rounded px-2 py-0.5 mb-1.5 text-[9px]">
                  📊 {msg.photo_analysis.summary || 'Analysis available'}
                </div>
              )}

              {/* Text */}
              {msg.message_text !== '📷 Photo' && (
                <p className="text-sm leading-relaxed">{renderMessageText(msg.message_text)}</p>
              )}

              {/* Flagged */}
              {msg.flagged && (
                <p className="text-[9px] mt-1 opacity-60">⚠️ Reported</p>
              )}

              {/* Time + report */}
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[9px] ${isOwnMessage(msg) || isAgentMessage(msg) ? 'text-white/40' : 'text-sos-gray-400'}`}>
                  {timeSince(msg.created_at)}
                </span>
                {!isOwnMessage(msg) && !isAgentMessage(msg) && !msg.flagged && (
                  <button onClick={() => setReportingId(msg.id)}
                    className="text-[9px] text-sos-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-sos-red-500">
                    Report
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Report modal */}
      {reportingId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setReportingId(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-8 h-1 bg-sos-gray-300 rounded-full mx-auto mb-3" />
            <p className="text-sm font-bold text-sos-blue-800 mb-3">Report Message</p>
            <div className="space-y-2">
              {['Spam or irrelevant', 'Contains personal information', 'Threatening or abusive', 'False information', 'Other'].map(reason => (
                <button key={reason} onClick={() => handleReport(reportingId, reason)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 hover:bg-sos-gray-200 transition-colors">
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-sos-blue-800 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] border-t border-white/10">
        {messagesThisHour >= RATE_LIMIT ? (
          <p className="text-center text-xs text-sos-red-300">Rate limit reached (20/hr). Try again later.</p>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoUploading}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0 disabled:opacity-30">
              {photoUploading ? <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" /> : '📷'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Message your community..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-sos-accent-400" />
            <button type="submit" disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl bg-sos-red-500 text-white flex items-center justify-center hover:bg-sos-red-600 disabled:opacity-30 transition-colors flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
