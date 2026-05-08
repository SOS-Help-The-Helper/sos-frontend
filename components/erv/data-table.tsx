'use client';

import { useState, useMemo } from 'react';

const BLUE = '#89CFF0';
const CARD_BG = '#1A3850';

export interface Column<T extends Record<string, any>> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  /** Used for sorting; falls back to row[key] */
  sortValue?: (row: T) => string | number;
  /** Used for search; falls back to String(row[key]) */
  searchValue?: (row: T) => string;
  /** Hide this column in mobile card view */
  mobileHide?: boolean;
}

export interface FilterColumnDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<T extends Record<string, any>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  filterColumns?: FilterColumnDef[];
  rowKey?: (row: T) => string;
}

const PAGE_SIZES = [25, 50, 100];

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found.',
  defaultSortKey,
  defaultSortDir = 'desc',
  filterColumns = [],
  rowKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  const toggleColFilter = (key: string, value: string) => {
    setColFilters(prev => {
      const next = { ...prev };
      if (next[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
    setPage(0);
  };

  const filtered = useMemo(() => {
    let rows = [...data];

    // Column-level filters
    Object.entries(colFilters).forEach(([key, val]) => {
      rows = rows.filter(
        row => String((row as any)[key] ?? '').toLowerCase() === val.toLowerCase()
      );
    });

    // Global search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(row =>
        columns.some(col => {
          const sv = col.searchValue
            ? col.searchValue(row)
            : String((row as any)[col.key] ?? '');
          return sv.toLowerCase().includes(q);
        })
      );
    }

    // Sort
    if (sortKey) {
      const col = columns.find(c => c.key === sortKey);
      rows.sort((a, b) => {
        const av = col?.sortValue ? col.sortValue(a) : ((a as any)[sortKey] ?? '');
        const bv = col?.sortValue ? col.sortValue(b) : ((b as any)[sortKey] ?? '');
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        const as2 = String(av).toLowerCase();
        const bs2 = String(bv).toLowerCase();
        return sortDir === 'asc' ? as2.localeCompare(bs2) : bs2.localeCompare(as2);
      });
    }

    return rows;
  }, [data, search, colFilters, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const exportCsv = () => {
    const headers = columns.map(c => `"${c.label}"`).join(',');
    const rows = filtered.map(row =>
      columns
        .map(col => {
          const raw = col.searchValue
            ? col.searchValue(row)
            : String((row as any)[col.key] ?? '');
          return `"${raw.replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'erv-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="rounded-xl p-4 space-y-2" style={{ background: CARD_BG }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-lg animate-pulse"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search all fields..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(0);
          }}
          style={{
            background: CARD_BG,
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            outline: 'none',
          }}
          className="flex-1 min-w-[180px] px-3 py-2 text-sm rounded-lg"
        />
        <button
          onClick={exportCsv}
          style={{
            background: 'rgba(137,207,240,0.12)',
            color: BLUE,
            border: '1px solid rgba(137,207,240,0.25)',
          }}
          className="px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap"
        >
          ↓ CSV
        </button>
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          style={{
            background: CARD_BG,
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            outline: 'none',
          }}
          className="px-2 py-2 text-xs rounded-lg"
        >
          {PAGE_SIZES.map(s => (
            <option key={s} value={s}>
              {s} / page
            </option>
          ))}
        </select>
      </div>

      {/* Column filter chips */}
      {filterColumns.length > 0 && (
        <div className="flex gap-x-5 gap-y-2 flex-wrap">
          {filterColumns.map(fc => (
            <div key={fc.key} className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-white/35 uppercase tracking-wider font-semibold shrink-0">
                {fc.label}:
              </span>
              {fc.options.map(opt => {
                const active = colFilters[fc.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleColFilter(fc.key, opt.value)}
                    style={{
                      background: active ? 'rgba(137,207,240,0.18)' : 'rgba(255,255,255,0.05)',
                      color: active ? BLUE : 'rgba(255,255,255,0.45)',
                      border: `1px solid ${active ? 'rgba(137,207,240,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div
        className="hidden md:block rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {filtered.length === 0 ? (
          <div className="py-14 text-center" style={{ background: CARD_BG }}>
            <p className="text-white/35 text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{ color: sortKey === col.key ? BLUE : 'rgba(255,255,255,0.4)' }}
                      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="ml-1 opacity-50">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row, i) => (
                  <tr
                    key={rowKey ? rowKey(row) : i}
                    style={{
                      background: i % 2 === 0 ? CARD_BG : 'rgba(20,45,68,0.7)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-2.5 text-white/80">
                        {col.render ? (
                          col.render(row)
                        ) : (
                          <span className="whitespace-nowrap">
                            {String((row as any)[col.key] ?? '—')}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div
            className="py-14 text-center rounded-xl"
            style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-white/35 text-sm">{emptyMessage}</p>
          </div>
        ) : (
          pageData.map((row, i) => (
            <div
              key={rowKey ? rowKey(row) : i}
              className="rounded-xl p-3.5 space-y-2.5"
              style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {columns
                .filter(c => !c.mobileHide)
                .map(col => (
                  <div key={col.key} className="flex items-start justify-between gap-3">
                    <span className="text-[10px] font-bold text-white/35 uppercase tracking-wider shrink-0 mt-0.5">
                      {col.label}
                    </span>
                    <div className="text-sm text-white/85 text-right">
                      {col.render
                        ? col.render(row)
                        : String((row as any)[col.key] ?? '—')}
                    </div>
                  </div>
                ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-white/35">
            {filtered.length === 0
              ? '0 results'
              : `${page * pageSize + 1}–${Math.min(
                  (page + 1) * pageSize,
                  filtered.length
                )} of ${filtered.length.toLocaleString()}`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                style={{
                  background: CARD_BG,
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-25"
              >
                ← Prev
              </button>
              <span className="px-2 text-xs text-white/35">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                style={{
                  background: CARD_BG,
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-25"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
