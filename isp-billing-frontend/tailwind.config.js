/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    corePlugins: {
        // Disable preflight to avoid conflicts with MUI CssBaseline
        preflight: false,
    },
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#FFD300', // Primary Accent Yellow
                    light: '#FFEB99', // Soft Gold Glow
                    dark: '#FFCC00', // Hover/Active Yellow
                    contrast: '#000000',
                },
                background: {
                    DEFAULT: '#0B0B0B', // Primary System Background
                    paper: '#111111', // Secondary Background
                    sidebar: '#0E0E0E', // Sidebar/Navbar Background
                },
                text: {
                    primary: '#FFFFFF',
                    secondary: '#BFBFBF',
                    muted: '#8A8A8A',
                    disabled: '#5C5C5C',
                },
                status: {
                    success: '#22C55E',
                    warning: '#FACC15',
                    error: '#EF4444',
                    info: '#3B82F6',
                },
                charts: {
                    blue: '#3B82F6',
                    green: '#22C55E',
                    orange: '#F97316',
                    purple: '#A855F7',
                    teal: '#14B8A6',
                    pink: '#EC4899',
                },
                glass: {
                    DEFAULT: 'rgba(255, 255, 255, 0.08)',
                    border: 'rgba(255, 255, 255, 0.18)',
                }
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(135deg, #FFD300 0%, #FFCC00 100%)',
            },
            fontFamily: {
                sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
            },
            zIndex: {
                'mobile-stepper': 1000,
                'app-bar': 1100,
                'drawer': 1200,
                'modal': 1300,
                'snackbar': 1400,
                'tooltip': 1500,
            }
        },
    },
    plugins: [],
}
