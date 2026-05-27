import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          hover: "var(--primary-hover)",
          active: "var(--primary-active)",
          bg: "var(--primary-background)",
          "bg-active": "var(--primary-background-active)",
        },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
          600: "var(--color-danger-600)",
          700: "var(--color-danger-700)",
          hover: "var(--destructive-hover)",
          active: "var(--destructive-active)",
          bg: "var(--destructive-background)",
          "bg-active": "var(--destructive-background-active)",
        },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        "neutral-bg": "var(--neutral-background)",
        "neutral-bg-active": "var(--neutral-background-active)",
        "inverse-text": "var(--inverse)",
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
          hover: "var(--success-hover)",
          active: "var(--success-active)",
          bg: "var(--success-background)",
          "bg-active": "var(--success-background-active)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
          hover: "var(--warning-hover)",
          active: "var(--warning-active)",
          bg: "var(--warning-background)",
          "bg-active": "var(--warning-background-active)",
        },
        info: {
          DEFAULT: "var(--info)",
          foreground: "var(--info-foreground)",
          hover: "var(--info-hover)",
          active: "var(--info-active)",
          bg: "var(--info-background)",
          "bg-active": "var(--info-background-active)",
        },
        neutral: {
          DEFAULT: "var(--neutral)",
          foreground: "var(--neutral-foreground)",
          hover: "var(--neutral-hover)",
          active: "var(--neutral-active)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "4xl": "2rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
