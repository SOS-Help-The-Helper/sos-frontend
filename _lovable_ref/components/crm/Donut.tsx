type Slice = { label: string; value: number; color: string };

type Props = {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
  onSliceClick?: (label: string) => void;
};

export function Donut({ slices, size = 140, thickness = 14, centerLabel, centerSub, onSliceClick }: Props) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} fill="none" />
        {slices.map((s, i) => {
          if (s.value === 0) return null;
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const dashoffset = -offset;
          offset += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={s.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={dash}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
              onClick={onSliceClick ? () => onSliceClick(s.label) : undefined}
              style={onSliceClick ? { cursor: "pointer" } : undefined}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerLabel && <span className="text-[22px] font-semibold tabular-nums leading-none">{centerLabel}</span>}
        {centerSub && <span className="font-mono text-[9px] uppercase tracking-wider text-white/45 mt-1">{centerSub}</span>}
      </div>
    </div>
  );
}
