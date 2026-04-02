'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AIToolRenderer } from '@/components/ai-tool-renderer';
import { onMapCommand, type MapCommand } from '@/lib/map-commands';

/**
 * Agent Test Page — Debug the full tool chain.
 * Shows: raw API responses, tool states, map commands emitted, errors.
 * URL: /c/test-agent
 */
export default function TestAgentPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [mapCmds, setMapCmds] = useState<MapCommand[]>([]);
  const [input, setInput] = useState('');
  const logsRef = useRef<HTMLDivElement>(null);
  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  const log = (msg: string) => {
    const ts = new Date().toISOString().substring(11, 19);
    setLogs(prev => [...prev, `[${ts}] ${msg}`]);
  };

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: {
        'x-person-id': personId || '',
        'x-authenticated': personId ? 'true' : 'false',
      },
    }),
    onError: (err) => log(`❌ ERROR: ${err.message}`),
  });

  // Subscribe to MapCommands
  useEffect(() => {
    const unsub = onMapCommand((cmd) => {
      log(`🗺️ MAP CMD: ${cmd.type} — ${JSON.stringify(cmd).substring(0, 200)}`);
      setMapCmds(prev => [...prev, cmd]);
    });
    return unsub;
  }, []);

  // Log status changes
  useEffect(() => {
    log(`📡 Status: ${status}`);
  }, [status]);

  // Log errors
  useEffect(() => {
    if (error) log(`❌ Chat error: ${error.message}`);
  }, [error]);

  // Auto-scroll logs
  useEffect(() => {
    logsRef.current?.scrollTo(0, logsRef.current.scrollHeight);
  }, [logs]);

  function send(text: string) {
    log(`➡️ SEND: "${text}"`);
    sendMessage({ text });
    setInput('');
  }

  // Quick test buttons
  const TESTS = [
    { label: "What's nearby?", msg: "What's around me?" },
    { label: 'I need help', msg: 'I need help' },
    { label: 'Find shelters', msg: 'Find shelters near me' },
    { label: 'Coverage gaps', msg: 'Where is help not reaching?' },
    { label: 'Am I safe?', msg: 'Am I in danger?' },
    { label: 'Track my SOS', msg: "Where's my help?" },
    { label: 'Compare food', msg: 'Which food bank is closest? Compare them.' },
    { label: 'Show route', msg: 'How do I get to the nearest shelter?' },
    { label: 'My score', msg: 'Show me my SOS score' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono text-xs">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-sm">🧪 Agent Test Page</span>
        <div className="flex gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${status === 'streaming' ? 'bg-green-500/20 text-green-400' : status === 'submitted' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/40'}`}>
            {status}
          </span>
          <button onClick={() => { setLogs([]); setMapCmds([]); }} className="px-2 py-0.5 rounded bg-white/10 text-white/50 hover:text-white">Clear</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-[calc(100vh-48px)]">
        {/* Left: Chat + Messages */}
        <div className="flex flex-col border-r border-white/10">
          {/* Quick test buttons */}
          <div className="flex flex-wrap gap-1.5 p-3 bg-[#111] border-b border-white/10">
            {TESTS.map(t => (
              <button key={t.label} onClick={() => send(t.msg)}
                className="px-2 py-1 rounded bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-[10px]">
                {t.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, mi) => (
              <div key={msg.id} className={`${(msg as any).role === 'user' ? 'text-green-400' : 'text-white/70'}`}>
                <div className="text-[10px] text-white/30 mb-0.5">{(msg as any).role} #{mi}</div>

                {(msg as any).parts?.map((part: any, pi: number) => {
                  if (part.type === 'text' && part.text) {
                    return <div key={pi} className="bg-white/5 rounded p-2 mb-1 whitespace-pre-wrap">{part.text}</div>;
                  }
                  if (part.type.startsWith('tool-')) {
                    const inv = { state: (part as any).state, result: (part as any).output, toolName: (part as any).toolName || part.type, args: (part as any).input, input: (part as any).input };
                    return (
                      <div key={pi} className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mb-1">
                        <div className="text-blue-400 font-bold">🔧 Tool: {inv?.toolName} (state: {inv?.state})</div>
                        {(inv?.args || inv?.input) ? (
                          <details className="mt-1">
                            <summary className="text-[10px] text-blue-300 cursor-pointer">Args</summary>
                            <pre className="text-[9px] text-white/40 mt-1 overflow-x-auto">{JSON.stringify(inv.args || inv.input, null, 2)}</pre>
                          </details>
                        ) : null}
                        {(inv?.state === 'result' || inv?.state === 'output-available') && (
                          <details open className="mt-1">
                            <summary className="text-[10px] text-green-300 cursor-pointer">Result</summary>
                            <pre className="text-[9px] text-white/40 mt-1 overflow-x-auto max-h-40">{
                              typeof inv.result === 'string' ? inv.result.substring(0, 1000) : JSON.stringify(inv.result, null, 2).substring(0, 1000)
                            }</pre>
                          </details>
                        )}
                        {(inv?.state === 'result' || inv?.state === 'output-available') && (() => {
                          try {
                            const data = typeof inv.result === 'string' ? JSON.parse(inv.result) : inv.result;
                            if (data?.__tool) {
                              return (
                                <details className="mt-1">
                                  <summary className="text-[10px] text-purple-300 cursor-pointer">Rendered Component ({data.__tool})</summary>
                                  <div className="mt-1 bg-[#0F1E2B] rounded p-2">
                                    <AIToolRenderer toolData={data} onUserAction={send} />
                                  </div>
                                </details>
                              );
                            }
                          } catch {}
                          return null;
                        })()}
                      </div>
                    );
                  }
                  // Log all unknown part types for debugging
                  return <div key={pi} className="text-amber-500/50 text-[9px] bg-amber-500/5 rounded px-2 py-1">Part type: {part.type} {part.toolName ? `(${part.toolName})` : ''} {JSON.stringify(part).substring(0, 200)}</div>;
                })}

                {/* Fallback: show content if no parts */}
                {!(msg as any).parts?.length && (msg as any).content && (
                  <div className="bg-white/5 rounded p-2 text-white/50">{(msg as any).content}</div>
                )}
              </div>
            ))}

            {(status === 'streaming' || status === 'submitted') && (
              <div className="text-amber-400 animate-pulse">⏳ {status}...</div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <form onSubmit={e => { e.preventDefault(); if (input.trim()) send(input.trim()); }} className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50" />
              <button type="submit" className="px-3 py-2 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">Send</button>
            </form>
          </div>
        </div>

        {/* Right: Logs + Map Commands */}
        <div className="flex flex-col">
          {/* Map Commands */}
          <div className="border-b border-white/10 max-h-[30vh] overflow-y-auto">
            <div className="px-3 py-2 bg-[#111] text-[10px] text-white/30 font-bold sticky top-0">🗺️ MAP COMMANDS ({mapCmds.length})</div>
            {mapCmds.length === 0 ? (
              <p className="px-3 py-4 text-white/20 text-center">No map commands emitted yet</p>
            ) : mapCmds.map((cmd, i) => (
              <div key={i} className="px-3 py-2 border-b border-white/5">
                <span className="text-green-400 font-bold">{cmd.type}</span>
                {cmd.results && <span className="text-white/30 ml-2">{cmd.results.length} results</span>}
                {cmd.route && <span className="text-white/30 ml-2">{cmd.route.distance_km}km, {cmd.route.duration_min}min</span>}
                {cmd.gaps && <span className="text-white/30 ml-2">{cmd.gaps.length} gaps</span>}
                {cmd.nearbySummary && <span className="text-white/30 ml-2">{cmd.nearbySummary.total} nearby</span>}
                <details className="mt-1">
                  <summary className="text-[9px] text-white/20 cursor-pointer">Full command</summary>
                  <pre className="text-[8px] text-white/30 mt-1 overflow-x-auto max-h-20">{JSON.stringify(cmd, null, 2)}</pre>
                </details>
              </div>
            ))}
          </div>

          {/* Debug Logs */}
          <div ref={logsRef} className="flex-1 overflow-y-auto">
            <div className="px-3 py-2 bg-[#111] text-[10px] text-white/30 font-bold sticky top-0">📋 LOGS</div>
            {logs.map((l, i) => (
              <div key={i} className="px-3 py-0.5 text-[10px] text-white/40 border-b border-white/3 font-mono">{l}</div>
            ))}
          </div>

          {/* Debug info */}
          <div className="p-3 border-t border-white/10 bg-[#111]">
            <div className="grid grid-cols-2 gap-2 text-[9px] text-white/30">
              <div>Person ID: {personId || 'none'}</div>
              <div>Messages: {messages.length}</div>
              <div>Status: {status}</div>
              <div>Error: {error?.message || 'none'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
