import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colores de la marca Adelante
        sol: {
          50: '#FFF9E6',
          100: '#FFF2CC',
          200: '#FFE599',
          300: '#FFD966',
          400: '#F2C94C', // Principal
          500: '#E6B800',
          600: '#CC9900',
          700: '#997300',
          800: '#664D00',
          900: '#332600',
        },
        crecimiento: {
          50: '#F5F9E8',
          100: '#EBF3D1',
          200: '#D7E7A3',
          300: '#C3DB75',
          400: '#A4C639', // Principal
          500: '#8CAF2E',
          600: '#6F8B24',
          700: '#53681B',
          800: '#384612',
          900: '#1C2309',
        },
        impulso: {
          50: '#FDEAEC',
          100: '#FBD5D9',
          200: '#F7ABB3',
          300: '#F3818D',
          400: '#E63946', // Principal
          500: '#D32F3E',
          600: '#A62531',
          700: '#7A1B25',
          800: '#4D1218',
          900: '#27090C',
        },
        neutro: {
          lienzo: '#F9F7F3',
          carbon: '#2D3436',
          piedra: '#636E72',
        },
        // Superficies para modo oscuro
        dark: {
          bg:       '#1C1E1F', // fondo principal
          surface:  '#262829', // tarjetas
          elevated: '#2F3133', // hover / elevado
          border:   '#383B3D', // bordes
          text:     '#F0EDE6', // texto principal (cálido, eco del lienzo)
          muted:    '#8E9599', // texto secundario
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        quicksand: ['Quicksand', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
      },
      animation: {
        blob: "blob 20s ease-in-out infinite",
      },
      keyframes: {
        blob: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
        },
      },
      boxShadow: {
        'glow-sol': '0 8px 32px rgba(242, 201, 76, 0.15)',
        'glow-sol-lg': '0 12px 48px rgba(242, 201, 76, 0.25)',
        'glow-crecimiento': '0 8px 32px rgba(164, 198, 57, 0.15)',
        'glow-crecimiento-lg': '0 12px 48px rgba(164, 198, 57, 0.25)',
        'glow-impulso': '0 8px 32px rgba(230, 57, 70, 0.15)',
        'glow-impulso-lg': '0 12px 48px rgba(230, 57, 70, 0.25)',
        // Dark mode glows — más intensos porque no compiten con fondo claro
        'glow-sol-dark': '0 8px 32px rgba(242, 201, 76, 0.25)',
        'glow-crecimiento-dark': '0 8px 32px rgba(164, 198, 57, 0.25)',
      },
    },
  },
  plugins: [],
};
export default config;
