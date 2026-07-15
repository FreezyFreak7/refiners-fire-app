/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Condensed industrial display for headings and controls; a workhorse grotesque for prose.
        display: ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
        sans: ['Archivo', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Soot: the forge's cold end. Near-black, faintly warm, not Tailwind's blue-tinted slate.
        soot: {
          950: '#08070a',
          900: '#0e0c11',
          850: '#141118',
          800: '#1a1620',
          700: '#241f2b',
          600: '#332c3c',
        },
        // Ash: text and chrome. Warm greys, never cool.
        // 600 is the dimmest step and is deliberately no darker than this: below roughly #8a8290
        // it drops under WCAG AA (4.5:1) on soot, and 600 is used for real labels and links,
        // not just decoration.
        ash: {
          600: '#8a8290',
          500: '#a49cab',
          400: '#bdb6c3',
          300: '#d5cfda',
          200: '#e6e2e9',
        },
        // Forge: the one accent for anything the player can act on — primary buttons and active
        // state. A deep molten orange-red (#d94100), applied as a subtle gradient via .btn-primary
        // so buttons read as heated metal rather than a flat fill.
        forge: {
          700: '#a83100',
          600: '#c23900',
          500: '#d94100',
          400: '#ef5a1a',
          300: '#ff7d47',
        },
        // Gold: kept for decorative accents only — reference chips, rings, hairline highlights.
        // No longer used for button fills (that is forge's job).
        gold: {
          700: '#8f6a1e',
          600: '#c8952f',
          500: '#d9a63c',
          400: '#e0b04a',
          300: '#eec87e',
        },
        // Ember: the flame itself. Background glow, drifting sparks, and the "hot/live" marker.
        // Deliberately NOT used for buttons — that is gold's job.
        ember: {
          700: '#9a2f0a',
          600: '#c53d0d',
          500: '#e8540f',
          400: '#ff6b1f',
          300: '#ff8f4d',
        },
        // Iron: hard edges and rules.
        iron: {
          800: '#26222c',
          700: '#37313f',
          600: '#4b4455',
        },
      },
      borderRadius: {
        // Forged, not injection-moulded. Hard corners with the barest chamfer.
        DEFAULT: '2px',
        sm: '1px',
        md: '2px',
        lg: '3px',
        xl: '3px',
        '2xl': '4px',
        '3xl': '4px',
      },
      letterSpacing: {
        forge: '0.08em',
      },
    },
  },
  plugins: [],
}
