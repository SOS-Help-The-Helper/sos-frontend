'use client';

import React, { useState } from 'react';

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
  idField?: string;
}

export function KanbanBoard({
  columns,
  items,
  groupBy,
  renderCard,
  onStatusChange,
  validTransitions,
  idField = 'id',
}: KanbanBoardProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragSourceColumn, setDragSourceColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const columnKeys = new Set(columns.map((c) => c.key));
  const grouped: Record<string, any[]> = {};
  for (const col of columns) grouped[col.key] = [];
  for (const item of items) {
    const val = item[groupBy];
    if (val && columnKeys.has(val)) grouped[val].push(item);
    else if (columns.length > 0) grouped[columns[0].key].push(item);
  }

  function isValidDrop(targetKey: string) {
    if (!dragSourceColumn || !validTransitions) return true;
    return validTransitions[dragSourceColumn]?.includes(targetKey) ?? true;
  }

  function colBorderClass(key: string) {
    if (dragOverColumn !== key) return '';
    return isValidDrop(key)
      ? 'border-2 border-white/20'
      : 'border-2 border-red-500/30 cursor-not-allowed';
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
        {columns.map((col) => {
          const colItems = grouped[col.key] ?? [];
          const borderCls = colBorderClass(col.key);
          return (
            <div
              key={col.key}
              className={`min-w-[280px] max-w-[300px] flex-shrink-0 bg-white/5 rounded-lg flex flex-col transition-colors ${borderCls}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverColumn !== col.key) setDragOverColumn(col.key);
              }}
              onDragEnter={() => setDragOverColumn(col.key)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                const itemId = e.dataTransfer.getData('itemId');
                const src = e.dataTransfer.getData('sourceColumn');
                if (itemId && src !== col.key && isValidDrop(col.key) && onStatusChange) {
                  onStatusChange(itemId, col.key);
                }
                setDraggedItemId(null);
                setDragSourceColumn(null);
              }}
            >
              {/* Column header */}
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                  <span className="text-sm font-medium text-white">{col.label}</span>
                </div>
                <span className="text-xs text-white/40">{colItems.length}</span>
              </div>

              {/* Drop zone indicator */}
              {dragOverColumn === col.key && isValidDrop(col.key) && (
                <div className="h-0.5 bg-white/20 mx-2 rounded-full" />
              )}

              {/* Column body */}
              <div className="px-2 py-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {colItems.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-4">No items</p>
                ) : (
                  colItems.map((item) => {
                    const itemId = String(item[idField] ?? '');
                    const isDragging = draggedItemId === itemId;
                    return (
                      <div
                        key={itemId || Math.random()}
                        draggable={!!onStatusChange}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('itemId', itemId);
                          e.dataTransfer.setData('sourceColumn', col.key);
                          setDraggedItemId(itemId);
                          setDragSourceColumn(col.key);
                        }}
                        onDragEnd={() => {
                          setDraggedItemId(null);
                          setDragSourceColumn(null);
                          setDragOverColumn(null);
                        }}
                        className={`transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
                      >
                        {renderCard({ item, onClick: (clicked) => clicked })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
