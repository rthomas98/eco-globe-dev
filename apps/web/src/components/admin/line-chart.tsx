"use client";

interface LineChartProps {
  data: number[];
  labels: string[];
  yPrefix?: string;
  color?: string;
  secondaryData?: number[];
  secondaryColor?: string;
  legend?: { primary: string; secondary: string };
}

export function LineChart({ data, labels, yPrefix = "$", color = "#378853", secondaryData, secondaryColor = "#C38F4A", legend }: LineChartProps) {
  const allValues = [...data, ...(secondaryData ?? [])];
  const max = Math.max(...allValues);
  const min = 0;
  const range = max - min || 1;

  const w = 800;
  const h = 200;
  const padL = 70;
  const padR = 20;
  const padT = 10;
  const padB = 30;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const toPath = (values: number[]) => {
    return values
      .map((v, i) => {
        const x = padL + (i / (values.length - 1)) * chartW;
        const y = padT + chartH - ((v - min) / range) * chartH;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  };

  const lastPoint = (values: number[]) => {
    const i = values.length - 1;
    return {
      x: padL + (i / (values.length - 1)) * chartW,
      y: padT + chartH - ((values[i] - min) / range) * chartH,
    };
  };

  const gridLines = 5;
  const yTicks = Array.from({ length: gridLines }, (_, i) => {
    const val = min + (range / (gridLines - 1)) * i;
    return { val, y: padT + chartH - (i / (gridLines - 1)) * chartH };
  });

  const formatY = (v: number) => {
    if (yPrefix === "$") {
      if (v >= 1000) return `${yPrefix}${(v / 1000).toFixed(0)},000`;
      return `${yPrefix}${v.toFixed(0)}`;
    }
    return `${v.toFixed(0)}`;
  };

  const p1 = lastPoint(data);

  return (
    <div className="w-full">
      {legend && (
        <div className="mb-2 flex items-center justify-end gap-6">
          <div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: color }} /><span className="text-xs text-neutral-500">{legend.primary}</span></div>
          <div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: secondaryColor }} /><span className="text-xs text-neutral-500">{legend.secondary}</span></div>
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTicks.map((t) => (
          <g key={t.val}>
            <line x1={padL} x2={w - padR} y1={t.y} y2={t.y} stroke="#F0F0F0" strokeWidth="1" />
            <text x={padL - 10} y={t.y + 4} textAnchor="end" fontSize="11" fill="#9E9E9E">{formatY(t.val)}</text>
          </g>
        ))}
        {/* X labels */}
        {labels.map((l, i) => (
          <text key={l} x={padL + (i / (labels.length - 1)) * chartW} y={h - 5} textAnchor="middle" fontSize="11" fill="#9E9E9E">{l}</text>
        ))}
        {/* Secondary line */}
        {secondaryData && (
          <path d={toPath(secondaryData)} fill="none" stroke={secondaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* Primary line */}
        <path d={toPath(data)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        <circle cx={p1.x} cy={p1.y} r="5" fill={color} stroke="white" strokeWidth="2" />
      </svg>
    </div>
  );
}
