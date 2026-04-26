/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FFFDF8',
          100: '#FEF9F0',
          200: '#FDF0DC',
        },
        velvet: {
          300: '#C084FC',
          400: '#A855F7',
          500: '#9333EA',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        gold: {
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
        },
        espresso: '#1C1209',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['Nunito', 'sans-serif'],
      },
      boxShadow: {
        velvet: '0 4px 24px rgba(109, 40, 217, 0.25)',
        'velvet-lg': '0 8px 40px rgba(109, 40, 217, 0.35)',
        card: '0 2px 16px rgba(28, 18, 9, 0.08)',
        'card-hover': '0 8px 32px rgba(28, 18, 9, 0.14)',
      },
      backgroundImage: {
        'velvet-btn': 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)',
        'velvet-btn-hover': 'linear-gradient(135deg, #9333EA 0%, #7C3AED 50%, #6D28D9 100%)',
        'gold-shimmer': 'linear-gradient(90deg, #B45309, #D97706, #F59E0B, #D97706, #B45309)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
      },
    },
  },
  plugins: [],
};
