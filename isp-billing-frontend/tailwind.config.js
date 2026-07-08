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
                    DEFAULT: '#DDA15E', // Warm wheat/gold tone
                    light: '#F4D3B2', // Soft warm glow
                    dark: '#BC813F', // Hover/Active gold
                    contrast: '#2B2B2B',
                },
                secondary: {
                    DEFAULT: '#2D6A4F', // Elegant green tone
                    light: '#52B788',
                    dark: '#1B4332',
                },
                background: {
                    DEFAULT: '#FAF7F2', // Very light warm cream background
                    paper: '#FFFFFF', // White surface
                    sidebar: '#FFFFFF', // White sidebar surface
                    elevated: '#F3EFE9', // Light elevated surface
                },
                text: {
                    primary: '#2B2B2B', // Charcoal text
                    secondary: '#5C5852', // Soft brown-gray text
                    muted: '#8E877E', // Muted brown-gray text
                    disabled: '#C5BEB5', // Disabled text
                },
                status: {
                    success: '#2D6A4F', // Using secondary green for success
                    warning: '#DDA15E', // Using primary yellow for warning
                    error: '#EF4444',
                    info: '#3B82F6',
                },
                charts: {
                    blue: '#3B82F6',
                    green: '#2D6A4F',
                    orange: '#DDA15E',
                    purple: '#8B5CF6',
                    teal: '#14B8A6',
                    pink: '#EC4899',
                },
                glass: {
                    DEFAULT: 'rgba(255, 255, 255, 0.7)',
                    border: 'rgba(43, 43, 43, 0.1)',
                }
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(135deg, #DDA15E 0%, #BC813F 100%)',
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
