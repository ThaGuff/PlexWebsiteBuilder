/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // WebHop brand - same DNA as Invoice King
        lime: {
          DEFAULT: '#C8E20A',
          50:  '#F7FCD0',
          100: '#F0F9A1',
          200: '#E4F46A',
          300: '#D8EE33',
          400: '#C8E20A',
          500: '#A8BF08',
          600: '#889C06',
          700: '#677804',
          800: '#475403',
          900: '#273001',
        },
        charcoal: {
          DEFAULT: '#1A1A1A',
          50:  '#F5F5F5',
          100: '#E8E8E8',
          200: '#C8C8C8',
          300: '#A0A0A0',
          400: '#707070',
          500: '#505050',
          600: '#3A3A3A',
          700: '#2A2A2A',
          800: '#1A1A1A',
          900: '#0F0F0F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-lime': 'pulseLime 2s ease-in-out infinite',
        'hop': 'hop 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseLime: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(200, 226, 10, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(200, 226, 10, 0)' },
        },
        hop: {
          '0%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-12px)' },
          '70%': { transform: 'translateY(-4px)' },
          '100%': { transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
