type Props = {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  type?: "line" | "bar";
  className?: string;
};

export function Sparkline({
  values,
  width = 120,
  height = 28,
  stroke = "#89CFF0",
  fill,
  type = "line",
  className,
}: Props) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = width / Math.max(1, values.length - 1);

  if (type === "bar") {
    const bw = width / values.length - 1.5;
    return (
      <svg width={width} height={height} className={className} role="img" aria-label="sparkline">
        {values.map((v, i) => {
          const h = ((v - min) / range) * (height - 2);
          return (
            <rect
              key={i}
              x={i * (bw + 1.5)}
              y={height - h}
              width={bw}
              height={h || 1}
              fill={stroke}
              opacity={0.85}
              rx={1}
            />
          );
        })}
      </svg>
    );
  }

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y] as const;
  });
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} className={className} role="img" aria-label="sparkline">
      {fill && <path d={area} fill={fill} opacity={0.18} />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={1.8} fill={stroke} />
    </svg>
  );
}
