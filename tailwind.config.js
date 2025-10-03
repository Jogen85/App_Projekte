/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      maxWidth: {
        'presentation': '1800px',
      },
      height: {
        'chart': '280px',
        'table': '520px',
        'kpi': '120px',
      },
    },
  },
  plugins: [],
};
