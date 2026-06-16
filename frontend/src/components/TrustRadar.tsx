'use client';

import { DIMENSIONS, type Dimension } from '@/lib/contract';

interface TrustRadarProps {
  scores: Record<Dimension, number>;
  size?: number;
  sweep?: boolean;
  accent?: string;
}

const LABELS: Record<Dimension, string> = {
  reliability: 'RELIABILITY',
  quality: 'QUALITY',
  honesty: 'HONESTY',
  timeliness: 'TIMELINESS',
};

export function TrustRadar({
  scores,
  size = 240,
  sweep = false,
  accent = '#c4f042',
}: TrustRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const axes = DIMENSIONS.length;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
    const radius = (Math.max(0, Math.min(100, value)) / 100) * r;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const axisEnd = (i: number) => {
    const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const labelPos = (i: number) => {
    const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
    return [cx + (r + 20) * Math.cos(angle), cy + (r + 20) * Math.sin(angle)];
  };

  const polygon = DIMENSIONS.map((d, i) => point(i, scores[d]).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Multi-axis trust radar"
      className="overflow-visible"
    >
      {rings.map((ring, ri) => (
        <polygon
          key={ri}
          points={DIMENSIONS.map((_, i) => {
            const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
            return [
              cx + r * ring * Math.cos(angle),
              cy + r * ring * Math.sin(angle),
            ].join(',');
          }).join(' ')}
          fill="none"
          stroke="#1f2937"
          strokeWidth={1}
        />
      ))}
      {DIMENSIONS.map((_, i) => {
        const [ex, ey] = axisEnd(i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={ex}
            y2={ey}
            stroke="#1f2937"
            strokeWidth={1}
          />
        );
      })}

      {sweep && (
        <g
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          className="animate-sweep"
        >
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r}
            stroke={accent}
            strokeWidth={1.5}
            opacity={0.5}
          />
          <polygon
            points={`${cx},${cy} ${cx},${cy - r} ${cx + r * 0.32},${cy - r * 0.94}`}
            fill={accent}
            opacity={0.08}
          />
        </g>
      )}

      <polygon
        points={polygon}
        fill={accent}
        fillOpacity={0.16}
        stroke={accent}
        strokeWidth={1.75}
      />
      {DIMENSIONS.map((d, i) => {
        const [px, py] = point(i, scores[d]);
        return <circle key={d} cx={px} cy={py} r={2.6} fill={accent} />;
      })}

      {DIMENSIONS.map((d, i) => {
        const [lx, ly] = labelPos(i);
        return (
          <text
            key={d}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-mono"
            fontSize={8.5}
            letterSpacing={1.4}
            fill="#9fb0c3"
          >
            {LABELS[d]}
          </text>
        );
      })}
      {DIMENSIONS.map((d, i) => {
        const [lx, ly] = labelPos(i);
        return (
          <text
            key={`${d}-v`}
            x={lx}
            y={ly + 11}
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-mono"
            fontSize={9}
            fill={accent}
          >
            {scores[d]}
          </text>
        );
      })}
    </svg>
  );
}
