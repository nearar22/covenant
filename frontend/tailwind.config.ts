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
      },
      animation: {
        sweep: 'sweep 4s linear infinite',
        ticker: 'ticker 40s linear infinite',
        pulseline: 'pulseline 2s ease-in-out infinite',
        flicker: 'flicker 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
