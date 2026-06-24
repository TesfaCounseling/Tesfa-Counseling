import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      screens: {
        xs: "380px",
      },
      colors: {
        ethio: {
          green: "#078930",
          "green-dark": "#056B24",
          "green-light": "#2DA44E",
          gold: "#FCD116",
          "gold-light": "#FDE68A",
          "gold-warm": "#FEF9C3",
          red: "#DA121A",
          "red-light": "#FCA5A5",
          page: "#F0EBE3",
          cream: "#FAF8F3",
          warm: "#FEF9E8",
          ink: "#1A1A1A",
          "ink-muted": "#4B5563",
        },
      },
      backgroundImage: {
        "ethio-gradient": "linear-gradient(135deg, #056B24 0%, #078930 45%, #2DA44E 100%)",
        "ethio-gradient-soft":
          "linear-gradient(160deg, #F0EBE3 0%, #FEF9E8 50%, #D4EDDA 100%)",
        "ethio-hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(7, 137, 48, 0.12), transparent)",
        "ethio-stripe":
          "linear-gradient(90deg, #078930 0%, #078930 33%, #FCD116 33%, #FCD116 66%, #DA121A 66%, #DA121A 100%)",
      },
      boxShadow: {
        ethio: "0 10px 40px -10px rgba(7, 137, 48, 0.28)",
        gold: "0 8px 30px -8px rgba(252, 209, 22, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
