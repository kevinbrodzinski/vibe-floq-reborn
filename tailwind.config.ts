import type { Config } from "tailwindcss";

// Safelist gradient classes for stop cards
const gradientSafelist = [
	"from-[#6B7CFF]",
	"to-[#48C3FF]",
	"from-[#00FFD1]",
	"to-[#6687FF]",
	"from-[#FF8D1A]",
	"to-[#FF593D]",
	"from-[#FF68F0]",
	"to-[#8E61FF]",
	"from-[#FF39C9]",
	"to-[#FF7F3F]",
	"from-[#FF6666]",
	"to-[#FF9999]",
	"from-[#1DD35F]",
	"to-[#38BDF8]",
	"bg-gradient-to-br",
];

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			spacing: {
				"mobile-action": "3rem", // 48 px minimum touch target
				"mobile-gap": "1rem",
			},

			/* ---------- merged borderRadius (no duplicates) ---------- */
			borderRadius: {
				mobile: "0.75rem",
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},

			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},

				/* ---------- merged warning (no duplicates) ---------- */
				warning: {
					DEFAULT: "hsl(var(--warning))",
					foreground: "hsl(var(--warning-foreground))",
				},

				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				persistent: {
					DEFAULT: "hsl(43 96% 56%)",
					foreground: "hsl(26 83% 14%)",
					600: "hsl(43 96% 46%)",
					50: "hsl(43 96% 96%)",
					10: "hsl(43 96% 90%)",
				},
				vibe: {
					chill: "51 100% 65%",
					social: "24 100% 67%",
					hype: "278 74% 71%",
					flowing: "174 84% 67%",
					romantic: "328 79% 70%",
					solo: "197 100% 50%",
					weird: "54 100% 67%",
					down: "220 9% 58%",
					open: "126 84% 75%",
					curious: "280 61% 68%",
				},
				neon: "var(--neon)",
				cardBg: "rgb(var(--card-bg) / <alpha-value>)",
				sidebar: {
					DEFAULT: "hsl(var(--sidebar-background))",
					foreground: "hsl(var(--sidebar-foreground))",
					primary: "hsl(var(--sidebar-primary))",
					"primary-foreground": "hsl(var(--sidebar-primary-foreground))",
					accent: "hsl(var(--sidebar-accent))",
					"accent-foreground": "hsl(var(--sidebar-accent-foreground))",
					border: "hsl(var(--sidebar-border))",
					ring: "hsl(var(--sidebar-ring))",
				},
			},

			backgroundImage: {
				"gradient-primary": "var(--gradient-primary)",
				"gradient-secondary": "var(--gradient-secondary)",
				"gradient-field": "var(--gradient-field)",
				"gradient-vibe": "var(--gradient-vibe)",
			},

			boxShadow: {
				glass:
					"0 0 0 0.5px rgb(255 255 255 / 0.1) inset, 0 0 24px rgb(255 255 255 / 0.06)",
			},

			keyframes: {
				pop: {
					"0%": { transform: "scale(0.4)", opacity: "0", "will-change": "transform" },
					"80%": { transform: "scale(1.15)", "will-change": "transform" },
					"100%": { transform: "scale(1)", opacity: "1", "will-change": "auto" },
				},
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
				"pulse-glow": {
					"0%, 100%": { "box-shadow": "0 0 20px hsl(252 100% 75% / 0.2)" },
					"50%": { "box-shadow": "0 0 40px hsl(252 100% 75% / 0.4)" },
				},
				float: {
					"0%, 100%": { transform: "translateY(0px)" },
					"50%": { transform: "translateY(-10px)" },
				},
				ripple: {
					"0%": { transform: "scale(0.8)", opacity: "1" },
					"100%": { transform: "scale(2.4)", opacity: "0" },
				},
				"pulse-once": {
					"0%": { transform: "scale(1)", opacity: "1" },
					"50%": { transform: "scale(1.05)", opacity: "0.8" },
					"100%": { transform: "scale(1)", opacity: "1" },
				},
				"slide-in-bottom": {
					"0%": { transform: "translateY(100%)" },
					"100%": { transform: "translateY(0)" },
				},
				"slide-out-bottom": {
					"0%": { transform: "translateY(0)" },
					"100%": { transform: "translateY(100%)" },
				},
				"fade-in": {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
				"fade-out": {
					"0%": { opacity: "1" },
					"100%": { opacity: "0" },
				},
			},

			animation: {
				pop: "pop 180ms cubic-bezier(0.4, 0, 0.2, 1)",
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"pulse-glow": "pulse-glow 2s ease-in-out infinite alternate",
				float: "float 3s ease-in-out infinite",
				ripple: "ripple 2s infinite",
				"pulse-once": "pulse-once 0.6s ease-out",
				"slide-in-bottom": "slide-in-bottom 0.35s cubic-bezier(0.16,1,0.3,1)",
				"slide-out-bottom": "slide-out-bottom 0.30s cubic-bezier(0.7,0,0.84,0) forwards",
				"fade-in": "fade-in 0.3s ease-out",
				"fade-out": "fade-out 0.3s ease-out",
			},
		},
	},
	safelist: [
		...gradientSafelist,
		"text-muted",
		"text-center",
		"py-12",
	],
	variants: {
		animation: ['responsive', 'motion-safe'],
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;