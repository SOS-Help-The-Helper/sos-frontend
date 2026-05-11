'use client';

import React from 'react';

export interface KanbanColumn {
  key: string;
  label: string;
  color: string;
}

export interface KanbanCardProps {
  item: any;
  onClick: (item: any) => void;
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  items: any[];
  groupBy: string;
  renderCard: (props: KanbanCardProps) => React.ReactNode;
  onStatusChange?: (itemId: string, newStatus: string) => void;
  validTransitions?: Record<string, string[]>;
}

export function KanbanBoard({
  columns,
  items,
  groupBy,
  renderCard,
  onStatusChange,
}: KanbanBoardProps) {
  const columnKeys = new Set(columns.map((c) => c.key));

  const grouped: Record<string, any[]> = {};
  for (const col of columns) {
    grouped[col.key] = [];
  }

  for (const item of items) {
    const val = item[groupBy];
    if (val && columnKeys.has(val)) {
      grouped[val].push(item);
    } else {
      // Items with no matching column go into the first column
      if (columns.length > 0) {
        grouped[columns[0].key].push(item);
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
        {columns.map((col) => {
          const colItems = grouped[col.key] ?? [];
          return (
            <div
              key={col.key}
              className="min-w-[280px] max-w-[300px] flex-shrink-0 bg-white/5 rounded-lg flex flex-col"
            >
              {/* Column header */}
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-sm font-medium text-white">{col.label}</span>
                </div>
                <span className="text-xs text-white/40">{colItems.length}</span>
              </div>

              {/* Column body */}
              <div
                className="px-2 py-2 space-y-2 overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              >
                {colItems.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-4">No items</p>
                ) : (
                  colItems.map((item) =>
                    renderCard({
                      item,
                      onClick: (clicked) => clicked,
                    })
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
