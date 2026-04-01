'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function ChatTest() {
  const [logs, setLogs] = useState<string[]>([]);
  function log(msg: string) { setLogs(prev => [...prev, msg]); console.log(msg); }

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onError: (err) => log('ERROR: ' + err.message),
  });

  const [input, setInput] = useState('');

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0F1E2B', color: 'white', fontFamily: 'sans-serif', fontSize: '13px' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        <p style={{ color: '#666', fontSize: '11px' }}>Status: {status} | Error: {error?.message || 'none'} | Messages: {messages.length}</p>
        
        {messages.map(m => (
          <div key={m.id} style={{ margin: '6px 0', padding: '8px', background: m.role === 'user' ? '#EF4E4B22' : '#89CFF022', borderRadius: '8px', fontSize: '12px' }}>
            <strong>{m.role}:</strong>
            {(m as any).parts?.map((part: any, i: number) => (
              <div key={i} style={{ marginTop: '4px' }}>
                {part.type === 'text' && <span>{part.text}</span>}
                {part.type === 'tool-invocation' && (
                  <div style={{ background: '#1A3850', padding: '6px', borderRadius: '6px', marginTop: '4px', fontSize: '10px' }}>
                    <p style={{ color: '#EDB200' }}>TOOL: {part.toolInvocation?.toolName} (state: {part.toolInvocation?.state})</p>
                    {part.toolInvocation?.state === 'result' && (
                      <pre style={{ color: '#89CFF0', fontSize: '9px', overflow: 'auto', maxHeight: '80px' }}>
                        {typeof part.toolInvocation.result === 'string' ? part.toolInvocation.result.substring(0, 300) : JSON.stringify(part.toolInvocation.result, null, 1).substring(0, 300)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid #333' }}>
        <button onClick={() => sendMessage({ text: 'Find shelters in Asheville' })} style={{ padding: '6px 12px', background: '#EF4E4B', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px' }}>Find shelters</button>
        <button onClick={() => sendMessage({ text: 'I need help' })} style={{ padding: '6px 12px', background: '#89CFF0', color: '#1A3850', border: 'none', borderRadius: '6px', fontSize: '11px' }}>I need help</button>
        <button onClick={() => sendMessage({ text: 'I can help' })} style={{ padding: '6px 12px', background: '#89CFF0', color: '#1A3850', border: 'none', borderRadius: '6px', fontSize: '11px' }}>I can help</button>
      </div>

      <div style={{ padding: '8px', display: 'flex', gap: '6px' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { sendMessage({ text: input }); setInput(''); }}}
          placeholder="Type..." style={{ flex: 1, padding: '8px', background: '#1A3850', border: '1px solid #333', borderRadius: '8px', color: 'white', fontSize: '13px' }} />
        <button onClick={() => { if (input.trim()) { sendMessage({ text: input }); setInput(''); }}} style={{ padding: '8px 16px', background: '#EF4E4B', color: 'white', border: 'none', borderRadius: '8px' }}>Send</button>
      </div>

      <div style={{ height: '100px', overflow: 'auto', background: '#000', color: '#0f0', fontFamily: 'monospace', fontSize: '9px', padding: '4px' }}>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
