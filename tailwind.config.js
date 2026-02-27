/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-text': 'var(--primary-text)',
        'secondary-text': 'var(--secondary-text)',
        'border-color': 'var(--border-color)',
        'primary-brand': 'var(--primary-brand)',
        'secondary-brand': 'var(--secondary-brand)',
        'accent-1': 'var(--accent-1)',
        'accent-2': 'var(--accent-2)',
        'accent-3': 'var(--accent-3)',
        'accent-4': 'var(--accent-4)',
        'surface': 'var(--surface)',
      },
      fontFamily: {
        'google-sans': ['Google Sans', 'sans-serif'],
        'thai': ['Noto Sans Thai', 'sans-serif'],
      },
    },
  },
  plugins: [],
}