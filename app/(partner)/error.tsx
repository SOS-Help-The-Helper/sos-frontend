'use client';

export default function PartnerError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h2>
      <pre style={{ fontSize: 12, color: '#EF4E4B', whiteSpace: 'pre-wrap', maxWidth: 600, margin: '0 auto 16px', textAlign: 'left', background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button onClick={reset} style={{ padding: '8px 16px', background: '#EF4E4B', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
        Try Again
      </button>
    </div>
  );
}
