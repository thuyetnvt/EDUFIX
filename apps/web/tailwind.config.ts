import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#dbeaff",
          500: "#2f6fed",
          600: "#245bd0",
          700: "#1d49a9",
          900: "#162e5a",
        },
      },
      boxShadow: { soft: "0 10px 30px rgba(22, 46, 90, 0.08)" },
    },
  },
  plugins: [],
};

export default config;
