/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"] ,
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef5ff",
          100: "#d7e6ff",
          200: "#adc8ff",
          300: "#83a9ff",
          400: "#5a8bff",
          500: "#2f6eff",
          600: "#1557e6",
          700: "#0e45b5",
          800: "#0b3384",
          900: "#0b2356"
        }
      },
      boxShadow: {
        card: "0 18px 40px rgba(9,45,120,0.16)",
        soft: "0 10px 20px rgba(9,45,120,0.08)"
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["IBM Plex Sans", "sans-serif"]
      }
    }
  },
  plugins: []
};
