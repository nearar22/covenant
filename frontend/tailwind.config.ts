import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          900: '#070a0f',
          800: '#0a0e14',
          700: '#0e131b',
          600: '#141b25',
          500: '#1c2531',
        },
        line: {
          DEFAULT: '#1f2937',
          bright: '#2c3a4d',
        },
        ink: {
          100: '#e8edf4',
          300: '#9fb0c3',
          500: '#5f7088',
        },
        lime: {
          DEFAULT: '#c4f042',
          dim: '#8fae2e',
        },
        cyan: {
          DEFAULT: '#3ee0e0',
          dim: '#1f9d9d',
        },
        amber: { DEFAULT: '#f0a830' },
        danger: { DEFAULT: '#ff5b6e' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseline: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        // Row flash: a brief lime wash when a ledger/stream row lands.
        rowflash: {
          '0%': { backgroundColor: 'rgba(196, 240, 66, 0.18)' },
          '100%': { backgroundColor: 'rgba(196, 240, 66, 0)' },
        },
        // Ticker pulse: the live status beacon ramps its glow.
        tickerpulse: {
          '0%, 100%': {
            opacity: '0.55',
            boxShadow: '0 0 0 0 rgba(62, 224, 224, 0.0)',
          },
          '50%': {
            opacity: '1',
            boxShadow: '0 0 8px 1px rgba(62, 224, 224, 0.5)',
          },
        },
        // Radar sweep arc: a periodic scan line that fades as it rotates.
        radarsweep: {
          '0%': { transform: 'rotate(-90deg)', opacity: '0.65' },
          '70%': { opacity: '0.2' },
          '100%': { transform: 'rotate(270deg)', opacity: '0.65' },
        },
        // Panel edge glow: a slow breathing border highlight.
        edgeglow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(196, 240, 66, 0)' },
          '50%': { boxShadow: '0 0 18px -6px rgba(196, 240, 66, 0.25)' },
        },
        // Status LED: a hard on/off blink for the instrument-cluster header dots.
        ledblink: {
          '0%, 100%': { opacity: '1', filter: 'brightness(1.2)' },
          '50%': { opacity: '0.45', filter: 'brightness(0.8)' },
        },
        // Sparkline draw-in: the trend trace strokes itself on mount.
        sparkdraw: {
          '0%': { strokeDashoffset: '240' },
          '100%': { strokeDashoffset: '0' },
        },
        // Composite counter glow: the big readout settles with a brief flash.
        countpop: {
          '0%': { opacity: '0', transform: 'translateY(4px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Tape-in: a fresh settlement row slides in like a printer feed.
        tapein: {
          '0%': { opacity: '0', transform: 'translateX(14px)' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Heartbeat: the SYNC telemetry pip double-thumps like an ECG.
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '14%': { transform: 'scale(1.5)', opacity: '1' },
          '28%': { transform: 'scale(1)', opacity: '0.7' },
          '42%': { transform: 'scale(1.35)', opacity: '0.95' },
          '60%': { transform: 'scale(1)', opacity: '0.6' },
        },
        // Bar fill: mini telemetry bars grow from zero on entry.
        barfill: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        // Scanline sweep: a thin highlight wipes across status strips.
        scanwipe: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        // Data glint: a small readout flashes when freshly synced.
        dataglint: {
          '0%': { color: '#3ee0e0', textShadow: '0 0 8px rgba(62,224,224,0.7)' },
          '100%': { color: '#e8edf4', textShadow: '0 0 0 rgba(62,224,224,0)' },
        },
        // Rise-in: a compact bottom-up reveal for stat tiles.
        risein: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Stage pulse: the active consensus node ring expands and fades.
        stagepulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(62, 224, 224, 0.45)' },
          '70%': { boxShadow: '0 0 0 7px rgba(62, 224, 224, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(62, 224, 224, 0)' },
        },
        // Ticker scroll: the activity rail marquees its content leftward.
        tickerscroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // Vertex pulse: radar vertex dots breathe so the plot reads as live.
        vertexpulse: {
          '0%, 100%': { r: '2.4', opacity: '0.85' },
          '50%': { r: '3.4', opacity: '1' },
        },
        // Glow drift: the hero panel inner glow slowly rotates its hue weight.
        glowdrift: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        sweep: 'sweep 4s linear infinite',
        ticker: 'ticker 40s linear infinite',
        pulseline: 'pulseline 2s ease-in-out infinite',
        flicker: 'flicker 1.4s ease-in-out infinite',
        rowflash: 'rowflash 1.1s ease-out 1',
        tickerpulse: 'tickerpulse 2.4s ease-in-out infinite',
        radarsweep: 'radarsweep 3.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        edgeglow: 'edgeglow 6s ease-in-out infinite',
        ledblink: 'ledblink 2.6s steps(2, jump-none) infinite',
        sparkdraw: 'sparkdraw 1.1s ease-out 1',
        countpop: 'countpop 0.5s cubic-bezier(0.16, 1, 0.3, 1) 1',
        tapein: 'tapein 0.5s cubic-bezier(0.16, 1, 0.3, 1) 1',
        heartbeat: 'heartbeat 2.2s ease-in-out infinite',
        barfill: 'barfill 0.9s cubic-bezier(0.16, 1, 0.3, 1) 1',
        scanwipe: 'scanwipe 7s ease-in-out infinite',
        dataglint: 'dataglint 1.2s ease-out 1',
        risein: 'risein 0.5s cubic-bezier(0.16, 1, 0.3, 1) 1',
        stagepulse: 'stagepulse 1.8s ease-out infinite',
        tickerscroll: 'tickerscroll 32s linear infinite',
        vertexpulse: 'vertexpulse 2.4s ease-in-out infinite',
        glowdrift: 'glowdrift 5.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
