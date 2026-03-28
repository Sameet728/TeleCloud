import defaultTheme from 'tailwindcss/defaultTheme'

const SPACING_SCALE = 0.82
const FONT_SCALE = 0.88
const LINE_HEIGHT_SCALE = 0.94

const scaleUnitValue = (value, factor) => {
  if (typeof value !== 'string') return value
  if (value === '1px' || value === '0' || value === '0px' || value === '0rem') return value

  const match = value.match(/^(-?\d*\.?\d+)(rem|px|em)$/)
  if (!match) return value

  const [, rawNumber, unit] = match
  const scaled = Number.parseFloat(rawNumber) * factor
  const precision = unit === 'px' ? 2 : 4

  return `${Number(scaled.toFixed(precision))}${unit}`
}

const scaledSpacing = Object.fromEntries(
  Object.entries(defaultTheme.spacing).map(([key, value]) => [
    key,
    scaleUnitValue(value, SPACING_SCALE),
  ])
)

const scaledFontSize = Object.fromEntries(
  Object.entries(defaultTheme.fontSize).map(([key, value]) => {
    if (!Array.isArray(value)) {
      return [key, scaleUnitValue(value, FONT_SCALE)]
    }

    const [fontSize, options] = value

    if (typeof options === 'string') {
      return [
        key,
        [
          scaleUnitValue(fontSize, FONT_SCALE),
          scaleUnitValue(options, LINE_HEIGHT_SCALE),
        ],
      ]
    }

    return [
      key,
      [
        scaleUnitValue(fontSize, FONT_SCALE),
        {
          ...options,
          ...(options.lineHeight
            ? { lineHeight: scaleUnitValue(options.lineHeight, LINE_HEIGHT_SCALE) }
            : {}),
        },
      ],
    ]
  })
)

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    spacing: scaledSpacing,
    fontSize: scaledFontSize,
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#1e1b4b',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn .2s ease',
        'slide-up': 'slideUp .3s ease',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
