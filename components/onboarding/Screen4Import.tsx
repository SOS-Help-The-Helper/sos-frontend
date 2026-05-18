'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Check, Loader2, FileSpreadsheet } from 'lucide-react';
import type { OnboardingData } from './types';

interface Props {
  data: OnboardingData;
  onUpdate: (partial: Partial<OnboardingData>) => void;
  onContinue: () => void;
  onSkip: () => void;
}

type Stage = 'idle' | 'mapping' | 'preview';

const SOS_FIELDS = ['First Name', 'Last Name', 'Email', 'Phone', 'Organization', 'Role', 'Address', '(skip)'];

// Simulated column mapping based on header name
function guessField(header: string): { field: string; confidence: 'high' | 'low' } {
  const h = header.toLowerCase();
  if (h.includes('first') || h === 'fname') return { field: 'First Name', confidence: 'high' };
  if (h.includes('last') || h === 'lname') return { field: 'Last Name', confidence: 'high' };
  if (h.includes('email') || h.includes('e-mail')) return { field: 'Email', confidence: 'high' };
  if (h.includes('phone') || h.includes('mobile') || h.includes('cell')) return { field: 'Phone', confidence: 'high' };
  if (h.includes('org') || h.includes('company')) return { field: 'Organization', confidence: 'high' };
  if (h.includes('role') || h.includes('title') || h.includes('position')) return { field: 'Role', confidence: 'high' };
  if (h.includes('address') || h.includes('street') || h.includes('location')) return { field: 'Address', confidence: 'high' };
  return { field: '(skip)', confidence: 'low' };
}

export function Screen4Import({ data, onUpdate, onContinue, onSkip }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  function parseCSV(text: string): { headers: string[]; rowCount: number } {
    const lines = text.trim().split('\n').filter(Boolean);
    const hdrs = lines[0]?.split(',').map((h) => h.replace(/["']/g, '').trim()) ?? [];
    return { headers: hdrs, rowCount: Math.max(0, lines.length - 1) };
  }

  function processFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: hdrs, rowCount: rows } = parseCSV(text);
      setRowCount(rows);
      setHeaders(hdrs);
      const initial: Record<string, string> = {};
      hdrs.forEach((h) => { initial[h] = guessField(h).field; });
      setStage('mapping');
      setTimeout(() => {
        setMappings(initial);
        setStage('preview');
      }, 1400);
    };
    reader.readAsText(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleImport() {
    onUpdate({ importedFile: fileName, importedCount: rowCount });
    onContinue();
  }

  const highCount = Object.entries(mappings).filter(([h]) => guessField(h).confidence === 'high').length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Already have contacts?</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Import a CSV and we'll map the columns for you.</p>
      </div>

      {stage === 'idle' && (
        <>
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            style={{
              border: `2px dashed ${isDragOver ? '#89CFF0' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 14, padding: '40px 24px', textAlign: 'center',
              background: isDragOver ? 'rgba(137,207,240,0.06)' : 'rgba(255,255,255,0.03)',
              transition: 'all 0.2s', cursor: 'pointer',
            }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={28} color="rgba(255,255,255,0.35)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>Drop CSV here</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>or click to browse</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />

          {/* Browse button */}
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            Browse files
          </button>
        </>
      )}

      {stage === 'mapping' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 16px' }}>
            <FileSpreadsheet size={18} color="#89CFF0" />
            <span style={{ fontSize: 14, color: '#fff' }}>{fileName}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{rowCount} rows</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            <Loader2 size={16} color="#89CFF0" style={{ animation: 'spin 1s linear infinite' }} />
            AI is mapping columns…
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {stage === 'preview' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 16px' }}>
            <FileSpreadsheet size={18} color="#89CFF0" />
            <span style={{ fontSize: 14, color: '#fff' }}>{fileName}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{rowCount} rows</span>
          </div>

          {/* Mapping table */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {headers.map((h) => {
              const isHigh = guessField(h).confidence === 'high';
              return (
                <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '7px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>→</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <select
                      value={mappings[h]}
                      onChange={(e) => setMappings({ ...mappings, [h]: e.target.value })}
                      style={{ flex: 1, fontSize: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 8px', color: '#fff', outline: 'none' }}
                    >
                      {SOS_FIELDS.map((f) => <option key={f} value={f} style={{ background: '#1a2f40' }}>{f}</option>)}
                    </select>
                    {isHigh && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                    {!isHigh && <div style={{ width: 20 }} />}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleImport}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 14,
              background: '#89CFF0', color: '#0F1E2B', fontWeight: 600,
              fontSize: 15, border: 'none', cursor: 'pointer',
            }}
          >
            Import {rowCount} contacts
          </button>
        </>
      )}

      {/* Skip link */}
      <button
        onClick={onSkip}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 13, cursor: 'pointer', padding: '4px 0' }}
      >
        Skip for now
      </button>
    </div>
  );
}
