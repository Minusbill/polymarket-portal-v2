/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"] ,
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f8f9fa",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#4b5563",
          600: "#374151",
          700: "#1f2937",
          800: "#111827",
          900: "#0b0f1a"
        },
        "bg-main": "#f8f9fa",
        "bg-sidebar": "#ffffff",
        "panel-bg": "#ffffff",
        "panel-border": "#e5e7eb",
        "panel-border-light": "#f3f4f6",
        "text-main": "#111827",
        "text-muted": "#4b5563",
        "text-light": "#9ca3af",
        neon: {
          green: "#00D67B",
          "green-dark": "#00B368"
        },
        dark: {
          main: "#050505",
          sidebar: "#0F0F11",
          panel: "#131315",
          border: "#27272A",
          borderLight: "#3F3F46"
        },
        success: "#00D67B",
        danger: "#EF4444"
      },
      boxShadow: {
        card: "0 16px 32px rgba(17,24,39,0.1)",
        soft: "0 8px 20px rgba(17,24,39,0.08)"
      },
      fontFamily: {
        display: ["Noto Sans SC", "PingFang SC", "sans-serif"],
        body: ["Noto Sans SC", "PingFang SC", "sans-serif"],
        mono: ["Sarasa Mono SC", "JetBrains Mono", "monospace"]
      }
    }
  },
  plugins: []
};
