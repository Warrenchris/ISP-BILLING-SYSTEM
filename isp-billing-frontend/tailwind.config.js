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
                    DEFAULT: '#DDA15E',
                    light: '#F4D3B2',
                    dark: '#BC813F',
                    contrast: '#FFFFFF',
                },
                secondary: {
                    DEFAULT: '#2D6A4F',
                    light: '#52B788',
                    dark: '#1B4332',
                },
                background: {
                    DEFAULT: '#F5F5F4',
                    paper: '#FFFFFF',
                    sidebar: '#FFFFFF',
                    elevated: '#FAFAF9',
                },
                text: {
                    primary: '#1C1917',
                    secondary: '#78716C',
                    muted: '#A8A29E',
                    disabled: '#D6D3D1',
                },
                status: {
                    success: '#2D6A4F',
                    warning: '#DDA15E',
                    error: '#DC2626',
                    info: '#2563EB',
                },
                charts: {
                    blue: '#2563EB',
                    green: '#2D6A4F',
                    orange: '#DDA15E',
                    purple: '#7C3AED',
                    teal: '#0D9488',
                    pink: '#DB2777',
                },
                border: {
                    DEFAULT: 'rgba(28, 25, 23, 0.06)',
                    strong: 'rgba(28, 25, 23, 0.12)',
                    brand: 'rgba(221, 161, 94, 0.25)',
                },
            },
            fontFamily: {
                sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
            },
            borderRadius: {
                'panel': '20px',
                'sidebar': '24px',
                'card': '20px',
                'button': '10px',
                'input': '10px',
            },
            boxShadow: {
                'panel': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
                'panel-hover': '0 4px 12px rgba(0, 0, 0, 0.06)',
                'sidebar': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
                'float': '0 2px 8px rgba(0, 0, 0, 0.04)',
                'dialog': '0 24px 48px -12px rgba(0, 0, 0, 0.12)',
            },
            zIndex: {
                'mobile-stepper': 1000,
                'app-bar': 1100,
                'drawer': 1200,
                'modal': 1300,
                'snackbar': 1400,
                'tooltip': 1500,
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
            },
        },
    },
    plugins: [],
}
