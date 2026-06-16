'use client';

import { useEffect, useRef } from 'react';

/**
 * ConsoleBackdrop
 * A mission-control backdrop drawn on a canvas. It is intentionally pushed
 * to be clearly visible (yet still behind the data layer) so any screenshot
 * reads as a live operations console:
 *  - a two-tier parallax slate grid (coarse + fine) that drifts
 *  - a wide rotating radar sweep glow with a leading edge line
 *  - faint travelling scanlines
 *  - occasional data-glints that spark on grid intersections
 *  - a breathing cyan pool in the upper right
 * devicePixelRatio aware, paused when the tab is hidden, and reduced to a
 * single static frame when prefers-reduced-motion is set.
 */

interface Glint {
  x: number;
  y: number;
  born: number;
  life: number;
}

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

    const FINE = 30;
    const COARSE = 120;
    let raf = 0;
    let start = performance.now();
    const glints: Glint[] = [];
    let nextGlint = 0;

    const drawGrid = (size: number, drift: number, stroke: string) => {
      ctx.lineWidth = 1;
      ctx.strokeStyle = stroke;
      ctx.beginPath();
      for (let x = -size + drift; x <= width + size; x += size) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = -size + drift; y <= height + size; y += size) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);

      // Base wash so the field is never pure black under the grid.
      const wash = ctx.createLinearGradient(0, 0, 0, height);
      wash.addColorStop(0, 'rgba(12, 17, 26, 0.5)');
      wash.addColorStop(1, 'rgba(7, 10, 15, 0.5)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, width, height);

      // Fine grid drifts faster; coarse grid drifts slower for parallax depth.
      drawGrid(FINE, (t * 7) % FINE, 'rgba(44, 58, 77, 0.26)');
      drawGrid(COARSE, (t * 3.5) % COARSE, 'rgba(62, 224, 224, 0.08)');

      // Wide horizontal scan sweep band that travels down the field, like a
      // sensor refresh pass. Brighter leading edge, soft trailing falloff.
      const bandH = 220;
      const by = ((t * 70) % (height + bandH)) - bandH;
      const band = ctx.createLinearGradient(0, by, 0, by + bandH);
      band.addColorStop(0, 'rgba(196, 240, 66, 0)');
      band.addColorStop(0.82, 'rgba(196, 240, 66, 0.025)');
      band.addColorStop(0.97, 'rgba(196, 240, 66, 0.07)');
      band.addColorStop(1, 'rgba(62, 224, 224, 0.12)');
      ctx.fillStyle = band;
      ctx.fillRect(0, by, width, bandH);

      // Radar sweep glow anchored off the lower-left, slowly rotating.
      const cx = width * 0.26;
      const cy = height * 0.82;
      const radius = Math.hypot(width, height);
      const angle = t * 0.2;
      if (ctx.createConicGradient) {
        const grad = ctx.createConicGradient(angle, cx, cy);
        grad.addColorStop(0, 'rgba(196, 240, 66, 0.1)');
        grad.addColorStop(0.05, 'rgba(196, 240, 66, 0.03)');
        grad.addColorStop(0.14, 'rgba(196, 240, 66, 0)');
        grad.addColorStop(1, 'rgba(196, 240, 66, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Leading edge line of the sweep, so the rotation is legible.
        ctx.save();
        ctx.strokeStyle = 'rgba(196, 240, 66, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.stroke();
        ctx.restore();

        // Faint range rings around the sweep origin.
        ctx.strokeStyle = 'rgba(44, 58, 77, 0.28)';
        ctx.lineWidth = 1;
        for (let r = 160; r < radius; r += 200) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Faint cyan glow pool that breathes near the top-right.
      const pulse = 0.05 + 0.03 * (0.5 + 0.5 * Math.sin(t * 0.6));
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

      // Travelling scanlines down the field.
      ctx.strokeStyle = 'rgba(196, 240, 66, 0.06)';
      for (let i = 0; i < 3; i++) {
        const sy = ((t * 26 + i * height * 0.4) % (height + 80)) - 40;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
      }

      // Data-glints: brief sparks that land on fine-grid intersections.
      if (now > nextGlint) {
        nextGlint = now + 280 + Math.random() * 620;
        glints.push({
          x: Math.round((Math.random() * width) / FINE) * FINE,
          y: Math.round((Math.random() * height) / FINE) * FINE,
          born: now,
          life: 900 + Math.random() * 700,
        });
        if (glints.length > 14) glints.shift();
      }
      for (let i = glints.length - 1; i >= 0; i--) {
        const g = glints[i];
        const p = (now - g.born) / g.life;
        if (p >= 1) {
          glints.splice(i, 1);
          continue;
        }
        const a = Math.sin(p * Math.PI) * 0.7;
        const isCyan = (g.x / FINE + g.y / FINE) % 2 === 0;
        const col = isCyan ? '62, 224, 224' : '196, 240, 66';
        ctx.fillStyle = `rgba(${col}, ${a})`;
        ctx.fillRect(g.x - 1, g.y - 1, 2.5, 2.5);
        ctx.strokeStyle = `rgba(${col}, ${a * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(g.x - 5, g.y);
        ctx.lineTo(g.x + 5, g.y);
        ctx.moveTo(g.x, g.y - 5);
        ctx.lineTo(g.x, g.y + 5);
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
