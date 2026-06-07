'use client';

import {
  useState,
  useRef,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from 'react';

const NAVY = '#0F1E2B';
const ACCENT = '#89CFF0';
const RED = '#EF4E4B';

const SAVED_HOLD_MS = 1200;

export interface TableColumn {
  id: string;
  label: string;
  width?: number | string;
  editable?: boolean;
  type?: 'text' | 'select' | 'readonly' | 'badge';
  options?: { value: string; label: string; color?: string }[]; // for select / badge
  render?: (value: any, row: any) => ReactNode; // custom render
  source?: string; // dot path for metadata fields e.g. 'metadata.rv_type'
}

interface EditableTableProps {
  columns: TableColumn[];
  rows: Record<string, any>[];
  rowKey?: string; // field to use as unique key, default 'id'
  onSave: (rowId: string, field: string, value: any) => Promise<void>;
  onRowClick?: (rowId: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}

// Resolve a dot path (e.g. 'metadata.rv_type') against a row object.
function getValue(row: Record<string, any>, path: string): any {
  if (!path) return undefined;
  return path
    .split('.')
    .reduce((acc: any, key) => (acc == null ? acc : acc[key]), row);
}

type CellPhase = 'idle' | 'editing' | 'saved' | 'error';

export function EditableTable({
  columns,
  rows,
  rowKey = 'id',
  onSave,
  onRowClick,
  loading = false,
  emptyMessage = 'No records',
}: EditableTableProps) {
  // Key identifying the cell currently being edited: `${rowId}::${colId}`.
  const [activeCell, setActiveCell] = useState<string | null>(null);
  // Transient per-cell phases for the save/error border animation.
  const [phases, setPhases] = useState<Record<string, CellPhase>>({});
  const [draft, setDraft] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  function cellId(rowId: string, colId: string) {
    return `${rowId}::${colId}`;
  }

  function setPhase(id: string, phase: CellPhase, holdMs?: number) {
    setPhases((prev) => ({ ...prev, [id]: phase }));
    if (timers.current[id]) clearTimeout(timers.current[id]);
    if (holdMs != null) {
      timers.current[id] = setTimeout(() => {
        setPhases((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        delete timers.current[id];
      }, holdMs);
    }
  }

  function beginEdit(rowId: string, col: TableColumn, current: any) {
    if (col.editable === false || col.type === 'readonly') return;
    const id = cellId(rowId, col.id);
    setActiveCell(id);
    setDraft(current == null ? '' : String(current));
    setPhase(id, 'editing');
  }

  function cancelEdit(id: string) {
    setActiveCell(null);
    setPhases((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function commit(rowId: string, col: TableColumn, value: any, original: any) {
    const id = cellId(rowId, col.id);
    setActiveCell(null);
    // No change — just drop the border without a save round-trip.
    if (value === original || (original == null && value === '')) {
      cancelEdit(id);
      return;
    }
    try {
      await onSave(rowId, col.source || col.id, value);
      // Navy border held briefly, then fades back to idle.
      setPhase(id, 'saved', SAVED_HOLD_MS);
    } catch {
      // Flash red, then revert. Parent surfaces the toast.
      setPhase(id, 'error', 600);
    }
  }

  const cellBorder = (phase: CellPhase | undefined): string => {
    switch (phase) {
      case 'editing':
        return RED;
      case 'saved':
        return NAVY;
      case 'error':
        return RED;
      default:
        return 'transparent';
    }
  };

  // ---- Loading skeleton -------------------------------------------------
  if (loading) {
    return (
      <div style={styles.scroll}>
        <style>{shimmerKeyframes}</style>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} style={{ ...styles.th, width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, r) => (
              <tr key={r} style={r % 2 ? styles.rowAlt : styles.row}>
                {columns.map((col) => (
                  <td key={col.id} style={styles.td}>
                    <div style={styles.shimmer} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ---- Empty state ------------------------------------------------------
  if (!rows.length) {
    return (
      <div style={styles.scroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} style={{ ...styles.th, width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div style={styles.empty}>{emptyMessage}</div>
      </div>
    );
  }

  // ---- Table ------------------------------------------------------------
  return (
    <div style={styles.scroll}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id} style={{ ...styles.th, width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => {
            const rid = String(row[rowKey]);
            return (
              <tr
                key={rid}
                style={{
                  ...(rowIdx % 2 ? styles.rowAlt : styles.row),
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
                onClick={onRowClick ? () => onRowClick(rid) : undefined}
              >
                {columns.map((col) => {
                  const id = cellId(rid, col.id);
                  const phase = phases[id];
                  const isActive = activeCell === id;
                  const raw = col.source ? getValue(row, col.source) : row[col.id];
                  const editable = col.editable !== false && col.type !== 'readonly';

                  const tdStyle: CSSProperties = {
                    ...styles.td,
                    border: `2px solid ${cellBorder(phase)}`,
                    background:
                      phase === 'editing'
                        ? 'rgba(255,255,255,0.06)'
                        : 'transparent',
                    cursor: editable ? 'text' : 'default',
                  };

                  // Stop row-click while interacting with a cell.
                  const stop = (e: React.MouseEvent) => e.stopPropagation();

                  return (
                    <td
                      key={col.id}
                      style={tdStyle}
                      onClick={
                        editable
                          ? (e) => {
                              stop(e);
                              if (!isActive) beginEdit(rid, col, raw);
                            }
                          : stop
                      }
                    >
                      {isActive &&
                      (col.type === 'select' || col.type === 'badge') ? (
                        <select
                          ref={selectRef}
                          autoFocus
                          defaultValue={raw == null ? '' : String(raw)}
                          style={styles.select}
                          onClick={stop}
                          onChange={(e) =>
                            commit(rid, col, e.target.value, raw)
                          }
                          onBlur={() => cancelEdit(id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') cancelEdit(id);
                          }}
                        >
                          {(col.options || []).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : isActive ? (
                        <input
                          ref={inputRef}
                          autoFocus
                          value={draft}
                          style={styles.input}
                          onClick={stop}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commit(rid, col, draft, raw)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commit(rid, col, draft, raw);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEdit(id);
                            }
                          }}
                        />
                      ) : col.render ? (
                        col.render(raw, row)
                      ) : col.type === 'badge' ? (
                        <Badge value={raw} options={col.options} />
                      ) : (
                        <span style={styles.cellText}>
                          {raw == null || raw === '' ? '—' : String(raw)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Badge({
  value,
  options,
}: {
  value: any;
  options?: { value: string; label: string; color?: string }[];
}) {
  if (value == null || value === '') return <span style={styles.cellText}>—</span>;
  const opt = options?.find((o) => o.value === String(value));
  const color = opt?.color || ACCENT;
  return (
    <span
      style={{
        ...styles.badge,
        color,
        background: `${color}22`,
        border: `1px solid ${color}55`,
      }}
    >
      {opt?.label || String(value)}
    </span>
  );
}

const shimmerKeyframes = `
@keyframes sos-shimmer {
  0% { opacity: 0.35; }
  50% { opacity: 0.7; }
  100% { opacity: 0.35; }
}`;

const styles: Record<string, CSSProperties> = {
  scroll: {
    width: '100%',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: NAVY,
    borderRadius: 8,
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    color: '#fff',
    fontSize: 13,
    minWidth: 'max-content',
  },
  th: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    textAlign: 'left',
    padding: '0 12px',
    height: 36,
    background: '#0a1620',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  row: {
    background: 'transparent',
  },
  rowAlt: {
    background: 'rgba(255,255,255,0.025)',
  },
  td: {
    height: 36,
    padding: '0 12px',
    whiteSpace: 'nowrap',
    transition: 'border-color 300ms ease, background-color 300ms ease',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  cellText: {
    color: 'rgba(255,255,255,0.9)',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: 13,
    fontFamily: 'inherit',
    padding: 0,
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    background: NAVY,
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: 13,
    fontFamily: 'inherit',
    padding: 0,
  },
  badge: {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
  },
  empty: {
    padding: '32px 12px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  shimmer: {
    height: 12,
    width: '70%',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.12)',
    animation: 'sos-shimmer 1.4s ease-in-out infinite',
  },
};

export default EditableTable;
