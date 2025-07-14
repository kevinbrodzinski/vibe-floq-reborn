import type { Config } from "tailwindcss";

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
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			spacing: {
				'mobile-action': '3rem', // 48px minimum touch target
				'mobile-gap': '1rem',
			},
			borderRadius: {
				'mobile': '0.75rem',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				persistent: {
					DEFAULT: 'hsl(43 96% 56%)',
					foreground: 'hsl(26 83% 14%)',
					600: 'hsl(43 96% 46%)',
					50: 'hsl(43 96% 96%)',
					10: 'hsl(43 96% 90%)'
				},
				warning: 'hsl(var(--warning))',
				vibe: {
					chill: '51 100% 65%',
					social: '24 100% 67%', 
					hype: '278 74% 71%',
					flowing: '174 84% 67%',
					romantic: '328 79% 70%',
					solo: '197 100% 50%',
					weird: '54 100% 67%',
					down: '220 9% 58%',
					open: '126 84% 75%',
					curious: '280 61% 68%'
				},
				cardBg: 'rgb(var(--card-bg) / <alpha-value>)',
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-field': 'var(--gradient-field)',
				'gradient-vibe': 'var(--gradient-vibe)'
			},
			boxShadow: {
				glass: '0 0 0 0.5px rgb(255 255 255 / 0.1) inset, 0 0 24px rgb(255 255 255 / 0.06)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'pop': {
					'0%': {
						transform: 'scale(0.4)',
						opacity: '0',
						'will-change': 'transform'
					},
					'80%': {
						transform: 'scale(1.15)',
						'will-change': 'transform'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1',
						'will-change': 'auto'
					}
				},
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'pulse-glow': {
					'0%, 100%': {
						'box-shadow': '0 0 20px hsl(252 100% 75% / 0.2)'
					},
					'50%': {
						'box-shadow': '0 0 40px hsl(252 100% 75% / 0.4)'
					}
				},
				'float': {
					'0%, 100%': {
						transform: 'translateY(0px)'
					},
					'50%': {
						transform: 'translateY(-10px)'
					}
				},
				'ripple': {
					'0%': {
						transform: 'scale(0.8)',
						opacity: '1'
					},
					'100%': {
						transform: 'scale(2.4)',
						opacity: '0'
					}
				}
			},
			animation: {
				'pop': 'pop 180ms cubic-bezier(0.4, 0, 0.2, 1)',
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite alternate',
				'float': 'float 3s ease-in-out infinite',
				'ripple': 'ripple 2s infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
