/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        luxury: {
          primary: '#81A6C6',
          secondary: '#AACDDC',
          cream: '#F3E3D0',
          'cream-light': '#FAF5EF',
          taupe: '#D2C4B4',
          text: '#1E293B',
          muted: '#475569',
        },
        brand: {
          50: '#f4f8fb',
          100: '#e5eff6',
          200: '#aacddc',
          300: '#81a6c6',
          400: '#5e8cb5',
          600: '#46729c',
          700: '#385c80',
          800: '#304d6a',
          900: '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
