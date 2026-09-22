/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#030712',
          900: '#060d1d',
          850: '#0a1426',
          800: '#0f1d35',
          700: '#172c4e',
          600: '#234475',
          500: '#0284c7',
          400: '#38bdf8',
          300: '#7dd3fc',
          200: '#bae6fd',
          100: '#e0f2fe',
        },
        cyan: {
          glow: '#00f2fe',
          neon: '#06b6d4',
          accent: '#22d3ee',
        },
        anomaly: {
          cold: '#0284c7',
          cool: '#38bdf8',
          neutral: '#94a3b8',
          warm: '#f59e0b',
          hot: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -2px rgba(0, 242, 254, 0.35)',
        'glow-blue': '0 0 20px -2px rgba(14, 165, 233, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }
    },
  },
  plugins: [],
}
