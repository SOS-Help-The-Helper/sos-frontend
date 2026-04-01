'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function ChatTest() {
  const [logs, setLogs] = useState<string[]>([]);
  
  function log(msg: string) {
    console.log('[CHAT DIAG]', msg);
    setLogs(prev => [...prev, `${new Date().toISOString().slice(11,19)} ${msg}`]);
  }

  const { messages, sendMessage, status, error: chatError } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onError: (err) => log(`ERROR: ${err.message}`),
  });

  const [input, setInput] = useState('');

  function handleSend() {
    if (!input.trim()) return;
    log(`Sending: "${input}"`);
    log(`Status before send: ${status}`);
    log(`Messages count: ${messages.length}`);
    sendMessage({ text: input });
    setInput('');
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0F1E2B', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <h3>Messages ({messages.length})</h3>
        <p style={{ color: '#888', fontSize: '12px' }}>Status: {status} | Error: {chatError?.message || 'none'}</p>
        
        {messages.map(m => (
          <div key={m.id} style={{ margin: '8px 0', padding: '8px', background: m.role === 'user' ? '#EF4E4B33' : '#89CFF033', borderRadius: '8px' }}>
            <strong>{m.role}:</strong>
            
            {/* Try rendering content */}
            { (m as any).content && <p style={{ color: "#ff0" }}>content: {(m as any).content}</p>}
            
            {/* Render parts (v6 pattern) */}
            {(m as any).parts?.map((part: any, i: number) => (
              <div key={i} style={{ fontSize: '13px', marginTop: '4px' }}>
                <span style={{ color: '#89CFF0' }}>[{part.type}]</span>{' '}
                {part.type === 'text' && <span>{part.text}</span>}
                {part.type === 'tool-invocation' && <span style={{ color: '#EDB200' }}>Tool: {part.toolInvocation?.toolName} (state: {part.toolInvocation?.state})</span>}
              </div>
            ))}
            
            {/* Show raw message for debugging */}
            <details style={{ marginTop: '4px' }}>
              <summary style={{ color: '#666', fontSize: '10px', cursor: 'pointer' }}>Raw JSON</summary>
              <pre style={{ fontSize: '9px', color: '#555', overflow: 'auto', maxHeight: '100px' }}>{JSON.stringify(m, null, 1)}</pre>
            </details>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '12px', borderTop: '1px solid #333', display: 'flex', gap: '8px' }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '8px', borderRadius: '8px', background: '#1A3850', border: '1px solid #333', color: 'white' }}
        />
        <button onClick={handleSend} style={{ padding: '8px 16px', borderRadius: '8px', background: '#EF4E4B', color: 'white', border: 'none', cursor: 'pointer' }}>
          Send
        </button>
      </div>

      {/* Diagnostic log */}
      <div style={{ height: '120px', overflow: 'auto', background: '#000', color: '#0f0', fontFamily: 'monospace', fontSize: '10px', padding: '6px' }}>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
