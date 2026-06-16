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
      },
    },
  },
  plugins: [],
};

export default config;
