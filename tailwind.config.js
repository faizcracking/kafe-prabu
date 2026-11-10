/** Palet Kafe Prabu: Espresso Black, Champagne Gold, Warm Cream, Coffee Brown */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        espresso: '#171717',
        gold: { DEFAULT: '#C9A45C', dark: '#A8863F', light: '#E3C98F' },
        cream: '#F4EFE5',
        coffee: '#6B4935',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: { soft: '0 8px 30px rgba(23,23,23,0.07)' },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(14px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: { 'fade-up': 'fade-up .35s ease-out both' },
    },
  },
  plugins: [],
};
