/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        selu: { green: '#006341', gold: '#C8A951', dark: '#071628' }
      },
      backgroundImage: {
        'app-gradient': 'radial-gradient(ellipse at 20% 0%, rgba(0,99,65,0.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(200,169,81,0.08) 0%, transparent 50%), linear-gradient(160deg, #071628 0%, #0a1f12 45%, #071628 100%)',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
