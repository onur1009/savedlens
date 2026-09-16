/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background": "#0c0e12",
        "primary": "#818cf8",
        "primary-container": "#4f46e5",
        "on-primary": "#ffffff",
        "secondary": "#94a3b8",
        "on-surface": "#f1f5f9",
        "surface-container": "#171a1f",
        "surface-container-high": "#1d2025",
        "surface-container-low": "#111318",
        "surface-container-lowest": "#08090c",
        "surface-container-highest": "#242831",
        "outline": "#475569",
        "tertiary": "#f472b6"
      },
      fontFamily: {
        "headline": ["Manrope", "sans-serif"],
        "body": ["Manrope", "sans-serif"],
        "label": ["Manrope", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
