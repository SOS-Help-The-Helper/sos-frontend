'use client';

/**
 * Lightweight SVG chart components. Zero dependencies.
 * Line chart, horizontal bar chart, donut chart.
 */

// --- LINE CHART ---

interface LinePoint { label: string; value: number }

export function LineChart({ data, height = 120, color = '#89CFF0', label }: {
  data: LinePoint[]; height?: number; color?: string; label?: string;
}) {
  if (data.length < 2) return <p className="text-xs text-sos-gray-400 text-center py-4">Not enough data</p>;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const w = 100;
  const h = height;
  const padY = 10;
  const usableH = h - padY * 2;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: padY + usableH - (d.value / maxVal) * usableH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div>
      {label && <p className="text-[10px] font-bold text-sos-gray-500 uppercase tracking-wider mb-2">{label}</p>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={`lg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#lg-${color.replace('#','')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-[9px] text-sos-gray-400 mt-1">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

// --- HORIZONTAL BAR CHART ---

interface BarItem { label: string; value: number; color?: string }

export function HorizontalBars({ data, label }: { data: BarItem[]; label?: string }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div>
      {label && <p className="text-[10px] font-bold text-sos-gray-500 uppercase tracking-wider mb-2">{label}</p>}
      <div className="space-y-2">
        {data.map((item, i) => {
          const pct = Math.round((item.value / maxVal) * 100);
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-sos-blue-800 capitalize">{item.label.replace(/_/g, ' ')}</span>
                <span className="font-bold text-sos-blue-800">{item.value}</span>
              </div>
              <div className="h-2 bg-sos-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color || '#89CFF0' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- DONUT CHART ---

interface DonutSlice { label: string; value: number; color: string }

export function DonutChart({ data, size = 120, label }: { data: DonutSlice[]; size?: number; label?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-xs text-sos-gray-400 text-center py-4">No data</p>;

  const r = 40;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <div style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {data.map((slice, i) => {
            const pct = slice.value / total;
            const dash = pct * circumference;
            const gap = circumference - dash;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={slice.color} strokeWidth="16"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-currentOffset}
              />
            );
          })}
        </svg>
      </div>
      <div className="space-y-1.5">
        {label && <p className="text-[10px] font-bold text-sos-gray-500 uppercase tracking-wider mb-1">{label}</p>}
        {data.map((slice, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
            <span className="text-[10px] text-sos-blue-800 capitalize">{slice.label.replace(/_/g, ' ')}</span>
            <span className="text-[10px] font-bold text-sos-gray-500 ml-auto">{slice.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
