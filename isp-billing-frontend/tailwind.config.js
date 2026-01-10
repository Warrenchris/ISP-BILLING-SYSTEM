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
                    DEFAULT: '#FFCC00', // Yellow Main
                    light: '#FFD633',
                    dark: '#B28F00',
                    contrast: '#000000',
                },
                background: {
                    DEFAULT: '#0a0a0f', // Global Dark
                    paper: '#13131a', // Card Dark
                    glass: 'rgba(19, 19, 26, 0.7)',
                },
                text: {
                    primary: '#FFFFFF',
                    secondary: '#A0A0A0',
                }
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
