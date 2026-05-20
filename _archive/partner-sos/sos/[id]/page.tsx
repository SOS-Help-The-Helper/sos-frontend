'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuthContext } from '@/lib/auth-context';
// TODO: rewire to lib/api.ts (Phase 3-5) — import { getSOSDetail, postSOSMessage, getParticipantColor, getParticipantIcon, SOSMessage, SOSParticipant } from '@/lib/sos-queries';
import { Send } from 'lucide-react';

export default function SOSDetail() {
  const params = useParams();
  const sosId = params.id as string;
  const { orgId, orgName, isAdmin } = useAuthContext();

  const [sos, setSOS] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [participants, setParticipants] = useState<SOSParticipant[]>([]);
  const [messages, setMessages] = useState<SOSMessage[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const data = await getSOSDetail(sosId);
      setSOS(data.sos);
      setRequests(data.requests);
      setResources(data.resources);
      setParticipants(data.participants);
      setMessages(data.messages);
      setMatches(data.matches);
      setLoading(false);
    }
    load();
    // Poll for new messages
    const interval = setInterval(async () => {
      const data = await getSOSDetail(sosId);
      setMessages(data.messages);
      setParticipants(data.participants);
    }, 10000);
    return () => clearInterval(interval);
  }, [sosId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const participantType = isAdmin ? 'coordinator' : orgId ? 'partner' : 'citizen';
    const msg = await postSOSMessage(sosId, input.trim(), orgId, participantType);
    if (msg) {
      setMessages(prev => [...prev, msg]);
    }
    setInput('');
    setSending(false);
  }

  if (loading) {
    return (
      <DashboardShell title="SOS Detail" subtitle="Loading...">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-[#FDFCFA] rounded-xl border border-sos-gray-300" />
          <div className="h-64 bg-[#FDFCFA] rounded-xl border border-sos-gray-300" />
        </div>
      </DashboardShell>
    );
  }

  const statusColor = sos?.status === 'active' ? 'bg-green-400' : 'bg-sos-gray-400';

  return (
    <DashboardShell
      title={`SOS #${sosId.slice(0, 5).toUpperCase()}`}
      subtitle={`${sos?.category?.replace(/_/g, ' ') || 'SOS'} · ${participants.length} participants`}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Column: Needs + Resources + Thread */}
        <div className="md:col-span-2 space-y-4">
          {/* Needs vs Resources */}
          <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider mb-2">Needs</h3>
                <div className="space-y-1.5">
                  {requests.length > 0 ? requests.map((req: any) => (
                    <div key={req.id} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        req.status === 'fulfilled' ? 'bg-green-400' :
                        req.status === 'matched' ? 'bg-sos-accent-500' :
                        'bg-sos-red-500'
                      }`} />
                      <span className="text-sm text-sos-blue-800 capitalize">{req.category?.replace(/_/g, ' ')}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                        req.urgency === 'critical' ? 'bg-sos-red-50 text-sos-red-700' :
                        req.urgency === 'high' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-sos-gray-200 text-sos-gray-600'
                      }`}>{req.urgency}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-sos-gray-500 italic">No needs recorded</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider mb-2">Resources Matched</h3>
                <div className="space-y-1.5">
                  {resources.length > 0 ? resources.map((res: any) => (
                    <div key={res.id} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        res.status === 'fulfilled' || res.status === 'deployed' ? 'bg-green-400' :
                        res.status === 'matched' ? 'bg-sos-accent-500' :
                        'bg-sos-gray-400'
                      }`} />
                      <span className="text-sm text-sos-blue-800 capitalize">{res.category?.replace(/_/g, ' ')}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-sos-gray-500 italic">No resources matched yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Collaboration Thread */}
          <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 overflow-hidden">
            <div className="px-5 py-3 border-b border-sos-gray-300 bg-sos-blue-800">
              <h3 className="text-sm font-bold text-white">Collaboration Thread</h3>
              <p className="text-[10px] text-sos-accent-400">{messages.length} messages · {participants.length} participants</p>
            </div>

            {/* Messages */}
            <div className="h-[400px] overflow-y-auto px-5 py-4 space-y-3">
              {messages.length > 0 ? messages.map((msg) => {
                const isOwn = (orgId && msg.org_id === orgId) || (!orgId && msg.participant_type === 'citizen');
                const icon = getParticipantIcon(msg.participant_type || msg.role || 'agent');

                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${isOwn ? '' : ''}`}>
                      {!isOwn && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm">{icon}</span>
                          <span className="text-[10px] font-semibold text-sos-gray-600 capitalize">
                            {msg.participant_type || msg.role}
                          </span>
                          <span className="text-[9px] text-sos-gray-400">
                            {timeAgo(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 ${
                        isOwn
                          ? 'bg-sos-blue-800 text-white rounded-br-md'
                          : msg.participant_type === 'citizen' || msg.role === 'citizen'
                          ? 'bg-sos-accent-50 text-sos-blue-800 rounded-bl-md border border-sos-accent-100'
                          : msg.participant_type === 'agent' || msg.role === 'agent' || msg.role === 'system'
                          ? 'bg-sos-gray-200 text-sos-gray-700 rounded-bl-md'
                          : 'bg-sos-blue-50 text-sos-blue-800 rounded-bl-md border border-sos-blue-100'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.message_text || msg.raw_content}</p>
                      </div>
                      {isOwn && (
                        <p className="text-[9px] text-sos-gray-400 text-right mt-0.5">{timeAgo(msg.created_at)}</p>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-sos-gray-500">No messages yet. Start the coordination.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="px-4 py-3 border-t border-sos-gray-300 bg-sos-gray-200/50">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-sos-gray-300 text-base md:text-sm text-sos-blue-800 placeholder:text-sos-gray-500 focus:outline-none focus:border-sos-accent-400 focus:ring-1 focus:ring-sos-accent-400/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-xl bg-sos-red-500 text-white flex items-center justify-center hover:bg-sos-red-600 disabled:opacity-30 transition-colors flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Participants + Matches */}
        <div className="space-y-4 md:sticky md:top-20 md:self-start">
          {/* Participants */}
          <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
            <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Participants</h3>
            <div className="space-y-2">
              {participants.length > 0 ? participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getParticipantIcon(p.participant_type)}</span>
                    <div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getParticipantColor(p.participant_type)}`}>
                        {p.participant_type}
                      </span>
                      {p.role && (
                        <span className="text-[10px] text-sos-gray-500 ml-1 capitalize">{p.role}</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    p.consent_status === 'consented' ? 'bg-green-50 text-green-600' :
                    p.consent_status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                    'bg-sos-gray-200 text-sos-gray-500'
                  }`}>
                    {p.consent_status}
                  </span>
                </div>
              )) : (
                <p className="text-xs text-sos-gray-500 italic">No participants yet</p>
              )}
            </div>
          </div>

          {/* Matches for this SOS */}
          {matches.length > 0 && (
            <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
              <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Matches ({matches.length})</h3>
              <div className="space-y-2">
                {matches.map((match: any) => (
                  <div key={match.id} className="flex items-center justify-between py-1.5 border-b border-sos-gray-200 last:border-0">
                    <div>
                      <span className="text-xs font-medium text-sos-blue-800">Score: {match.match_score}</span>
                      {match.chain_role && (
                        <span className="text-[10px] text-sos-gray-500 ml-1 capitalize">({match.chain_role})</span>
                      )}
                    </div>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${
                      match.status === 'fulfilled' ? 'bg-green-50 text-green-600' :
                      match.status === 'connected' ? 'bg-sos-accent-50 text-sos-accent-600' :
                      'bg-sos-gray-200 text-sos-gray-500'
                    }`}>
                      {match.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SOS Info */}
          <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
            <h3 className="text-sm font-bold text-sos-blue-800 mb-3">SOS Info</h3>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Status</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                  <span className="text-xs text-sos-blue-800 capitalize">{sos?.status || 'unknown'}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Type</span>
                <p className="text-xs text-sos-blue-800 capitalize">{sos?.sos_type || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Created</span>
                <p className="text-xs text-sos-blue-800">{sos?.created_at ? new Date(sos.created_at).toLocaleString() : '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
