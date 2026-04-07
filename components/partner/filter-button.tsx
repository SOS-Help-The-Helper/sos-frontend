'use client';

import { SlidersHorizontal } from 'lucide-react';
import { type FilterConfig, getActiveFilterCount } from '@/lib/filter-engine';

interface FilterButtonProps {
  config: FilterConfig;
  onClick: () => void;
}

export function FilterButton({ config, onClick }: FilterButtonProps) {
  const count = getActiveFilterCount(config);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:border-gray-500 hover:text-gray-100 transition-colors"
    >
      <SlidersHorizontal className="h-3.5 w-3.5" />
      <span>Filters</span>
      {count > 0 && (
        <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
