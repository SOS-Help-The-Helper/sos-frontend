'use client';

import { useState, useEffect, useRef } from 'react';
import { autoFitFontSize } from '@/lib/text-measure';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: 'blue' | 'red' | 'accent';
}

const accentStyles = {
  blue: 'border-l-sos-blue-800',
  red: 'border-l-sos-red-500',
  accent: 'border-l-sos-accent-500',
};

export function StatCard({ label, value, subtitle, trend, trendValue, accent = 'blue' }: StatCardProps) {
  const labelRef = useRef<HTMLParagraphElement>(null);
  const [labelSize, setLabelSize] = useState(12); // default xs = 12px

  useEffect(() => {
    if (!labelRef.current) return;
    const width = labelRef.current.offsetWidth;
    if (width > 0) {
      autoFitFontSize(label, width, 1, 12, 9, 'Roboto, sans-serif').then(setLabelSize);
    }
  }, [label]);

  return (
    <div className={`bg-[#FDFCFA] rounded-xl border border-sos-gray-300 border-l-4 ${accentStyles[accent]} p-5 transition-shadow hover:shadow-sm`}>
      <p
        ref={labelRef}
        className="font-medium text-sos-gray-600 uppercase tracking-wider whitespace-nowrap"
        style={{ fontSize: `${labelSize}px` }}
      >
        {label}
      </p>
      <div className="flex items-end gap-2 mt-2">
        <p className="text-2xl md:text-3xl font-bold text-sos-blue-800 leading-none">
          {value}
        </p>
        {trendValue && (
          <span className={`text-xs font-medium pb-0.5 ${
            trend === 'up' ? 'text-green-600' :
            trend === 'down' ? 'text-sos-red-500' :
            'text-sos-gray-500'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'} {trendValue}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-sos-gray-600 mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
