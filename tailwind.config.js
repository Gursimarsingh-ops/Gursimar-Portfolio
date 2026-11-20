/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        /*
         * The system Times face stays first, so desktop rendering is unchanged.
         * "Portfolio Serif" is the self-hosted metric-compatible fallback that
         * devices without Times (most Android phones and tablets) use instead of
         * an unrelated default serif.
         */
        serif: [
          '"Times New Roman"',
          "Times",
          '"Portfolio Serif"',
          "ui-serif",
          "Georgia",
          "Cambria",
          "serif",
        ],
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans"',
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
      },
    },
  },
  plugins: [],
}
