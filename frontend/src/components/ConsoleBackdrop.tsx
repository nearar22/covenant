'use client';

import { useEffect, useRef } from 'react';

/**
 * ConsoleBackdrop
 * A low-contrast mission-control backdrop drawn on a canvas:
 *  - a slowly drifting faint slate grid
 *  - a wide radar sweep glow that rotates around the viewport
 *  - a couple of slow horizontal scan lines
 * devicePixelRatio aware, and paused when the tab is hidden.
 * Kept deliberately dim so it never competes with the data layer.
 */
export function ConsoleBackdrop() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const GRID = 32;
    let raf = 0;
    let start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);

      // Drifting hairline grid. The offset loops over one cell so the
      // motion reads as a slow continuous drift, not a jump.
      const drift = (t * 6) % GRID;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(44, 58, 77, 0.16)';
      ctx.beginPath();
      for (let x = -GRID + drift; x <= width + GRID; x += GRID) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = -GRID + drift; y <= height + GRID; y += GRID) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Radar sweep glow anchored off the lower-left, slowly rotating.
      const cx = width * 0.28;
      const cy = height * 0.86;
      const radius = Math.hypot(width, height);
      const angle = t * 0.18;
      const grad = ctx.createConicGradient
        ? ctx.createConicGradient(angle, cx, cy)
        : null;
      if (grad) {
        grad.addColorStop(0, 'rgba(196, 240, 66, 0.06)');
        grad.addColorStop(0.04, 'rgba(196, 240, 66, 0.015)');
        grad.addColorStop(0.12, 'rgba(196, 240, 66, 0)');
        grad.addColorStop(1, 'rgba(196, 240, 66, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Faint cyan glow pool that breathes near the top-right.
      const pulse = 0.04 + 0.025 * (0.5 + 0.5 * Math.sin(t * 0.6));
      const pool = ctx.createRadialGradient(
        width * 0.82,
        height * 0.16,
        0,
        width * 0.82,
        height * 0.16,
        Math.max(width, height) * 0.5,
      );
      pool.addColorStop(0, `rgba(62, 224, 224, ${pulse})`);
      pool.addColorStop(1, 'rgba(62, 224, 224, 0)');
      ctx.fillStyle = pool;
      ctx.fillRect(0, 0, width, height);

      // Two slow scan lines travelling down the field.
      ctx.strokeStyle = 'rgba(196, 240, 66, 0.05)';
      for (let i = 0; i < 2; i++) {
        const sy = ((t * 28 + i * height * 0.55) % (height + 80)) - 40;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    const renderOnce = () => {
      // For reduced-motion: draw a single static frame.
      draw(start);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduce && raf === 0) {
        start = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };

    const onResize = () => {
      resize();
      if (reduce) renderOnce();
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    if (reduce) {
      renderOnce();
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
