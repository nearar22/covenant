'use client';

import { useEffect, useRef, useState } from 'react';
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

const SHORT: Record<Dimension, string> = {
  reliability: 'REL',
  quality: 'QLY',
  honesty: 'HON',
  timeliness: 'TML',
};

/**
 * TrustRadar is the hero telemetry instrument:
 *  - bold concentric calibration rings with a graduated bezel and minor ticks
 *  - axis spokes with labels + live per-axis value readouts
 *  - the reputation polygon animates open from the center on mount and
 *    morphs whenever the score signature changes (eased over ~950ms)
 *  - a continuously sweeping radar hand drags a fading persistence wedge
 *  - plotted vertices ping in and then pulse, like live contacts
 *  - radial crosshair guide lines so it reads as a real plotted gauge
 */
export function TrustRadar({
  scores,
  size = 240,
  sweep = false,
  accent = '#c4f042',
}: TrustRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 40;
  const axes = DIMENSIONS.length;

  // Animated progress 0..1 that drives the polygon opening from center.
  const [progress, setProgress] = useState(0);
  // Continuously rotating sweep angle (radians) for the radar hand.
  const [sweepAngle, setSweepAngle] = useState(0);
  const drawRaf = useRef(0);
  const sweepRaf = useRef(0);
  // A stable signature so we only re-run the draw-in when values change.
  const signature = DIMENSIONS.map((d) => scores[d]).join('|');

  const reduceMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    cancelAnimationFrame(drawRaf.current);
    if (reduceMotion()) {
      setProgress(1);
      return;
    }
    const duration = 950;
    const begin = performance.now();
    setProgress(0);
    const step = (now: number) => {
      const elapsed = now - begin;
      const tRaw = Math.min(1, elapsed / duration);
      // easeOutCubic for a settling instrument feel.
      const eased = 1 - Math.pow(1 - tRaw, 3);
      setProgress(eased);
      if (tRaw < 1) drawRaf.current = requestAnimationFrame(step);
    };
    drawRaf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(drawRaf.current);
  }, [signature]);

  // Continuous sweep hand (only when this radar is the active instrument).
  useEffect(() => {
    if (!sweep || reduceMotion()) return;
    let alive = true;
    const begin = performance.now();
    const loop = (now: number) => {
      if (!alive) return;
      // ~5s per revolution.
      setSweepAngle((((now - begin) / 5000) % 1) * Math.PI * 2);
      sweepRaf.current = requestAnimationFrame(loop);
    };
    sweepRaf.current = requestAnimationFrame(loop);
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(sweepRaf.current);
      } else {
        sweepRaf.current = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      cancelAnimationFrame(sweepRaf.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [sweep]);

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
    const radius = ((Math.max(0, Math.min(100, value)) / 100) * r) * progress;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const axisEnd = (i: number) => {
    const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const labelPos = (i: number, gap: number) => {
    const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
    return [cx + (r + gap) * Math.cos(angle), cy + (r + gap) * Math.sin(angle)];
  };

  const polygon = DIMENSIONS.map((d, i) => point(i, scores[d]).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1];

  // Sweep hand geometry + trailing persistence wedge.
  const handX = cx + r * Math.cos(sweepAngle - Math.PI / 2);
  const handY = cy + r * Math.sin(sweepAngle - Math.PI / 2);
  const trailSpan = 1.05; // radians of fading wedge behind the hand
  const trailX = cx + r * Math.cos(sweepAngle - Math.PI / 2 - trailSpan);
  const trailY = cy + r * Math.sin(sweepAngle - Math.PI / 2 - trailSpan);
  const largeArc = trailSpan > Math.PI ? 1 : 0;
  const idTag = `${accent.replace('#', '')}-${size}`;
  const gradId = `radarTrail-${idTag}`;
  const fillId = `radarFill-${idTag}`;

  // Outer minor tick ring (every 9 degrees).
  const minorTicks = Array.from({ length: 40 }, (_, i) => i);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Multi-axis trust radar"
      className="overflow-visible"
    >
      <defs>
        <radialGradient id={gradId}>
          <stop offset="0%" stopColor={accent} stopOpacity={0.34} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={fillId}>
          <stop offset="0%" stopColor={accent} stopOpacity={0.32} />
          <stop offset="100%" stopColor={accent} stopOpacity={0.08} />
        </radialGradient>
      </defs>

      {/* Faint dial face wash so the instrument has a seated bed. */}
      <circle cx={cx} cy={cy} r={r + 10} fill="rgba(7,10,15,0.55)" />

      {/* Outer bezel ring + minor ticks for an instrument dial feel. */}
      <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke="#2c3a4d" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="#1f2937" strokeWidth={1} />
      {minorTicks.map((i) => {
        const a = (Math.PI * 2 * i) / minorTicks.length - Math.PI / 2;
        const major = i % 5 === 0;
        const inner = r + (major ? 1 : 5);
        const outer = r + 10;
        return (
          <line
            key={`mt-${i}`}
            x1={cx + inner * Math.cos(a)}
            y1={cy + inner * Math.sin(a)}
            x2={cx + outer * Math.cos(a)}
            y2={cy + outer * Math.sin(a)}
            stroke={major ? '#46617d' : '#243140'}
            strokeWidth={major ? 1.3 : 1}
          />
        );
      })}

      {/* Concentric calibration rings. The outermost reads brightest. */}
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
          stroke={ri === rings.length - 1 ? '#3a4d63' : '#1f2937'}
          strokeWidth={ri === rings.length - 1 ? 1.3 : 1}
        />
      ))}
      {/* Concentric ring tick labels along the vertical axis (0..100). */}
      {rings.map((ring, ri) => (
        <text
          key={`tick-${ri}`}
          x={cx + 5}
          y={cy - r * ring}
          dominantBaseline="middle"
          className="font-mono"
          fontSize={7}
          fill="#5f7088"
        >
          {Math.round(ring * 100)}
        </text>
      ))}

      {/* Axis spokes. */}
      {DIMENSIONS.map((_, i) => {
        const [ex, ey] = axisEnd(i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={ex}
            y2={ey}
            stroke="#243140"
            strokeWidth={1}
          />
        );
      })}

      {sweep && (
        <g>
          {/* Trailing persistence wedge fading behind the hand. */}
          <path
            d={`M${cx},${cy} L${trailX},${trailY} A${r},${r} 0 ${largeArc} 1 ${handX},${handY} Z`}
            fill={`url(#${gradId})`}
            opacity={0.95}
          />
          {/* The sweep hand itself. */}
          <line
            x1={cx}
            y1={cy}
            x2={handX}
            y2={handY}
            stroke={accent}
            strokeWidth={1.6}
            opacity={0.85}
          />
          <circle cx={handX} cy={handY} r={2.4} fill={accent} opacity={0.95} />
        </g>
      )}

      {/* Reputation polygon: graduated fill, glowing stroke. */}
      <polygon
        points={polygon}
        fill={`url(#${fillId})`}
        stroke={accent}
        strokeWidth={2}
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 7px ${accent}66)` }}
      />
      {DIMENSIONS.map((d, i) => {
        const [px, py] = point(i, scores[d]);
        return (
          <g key={d}>
            {/* soft outer glow ring on each vertex */}
            <circle cx={px} cy={py} r={6} fill={accent} opacity={0.14 * progress} />
            <circle
              cx={px}
              cy={py}
              r={2.6 + (1 - progress) * 1.5}
              fill={accent}
              opacity={0.5 + 0.5 * progress}
              className={progress >= 1 && sweep ? 'animate-vertexpulse' : ''}
              style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
            />
          </g>
        );
      })}

      {/* center hub */}
      <circle cx={cx} cy={cy} r={2.4} fill="#5f7088" />
      <circle cx={cx} cy={cy} r={5} fill="none" stroke="#243140" strokeWidth={1} />

      {/* Axis labels + live value readouts. */}
      {DIMENSIONS.map((d, i) => {
        const [lx, ly] = labelPos(i, 24);
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
            {size >= 240 ? LABELS[d] : SHORT[d]}
          </text>
        );
      })}
      {DIMENSIONS.map((d, i) => {
        const [lx, ly] = labelPos(i, 24);
        return (
          <text
            key={`${d}-v`}
            x={lx}
            y={ly + 11}
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-mono"
            fontSize={9.5}
            fontWeight={600}
            fill={accent}
          >
            {String(scores[d]).padStart(2, '0')}
          </text>
        );
      })}
    </svg>
  );
}
