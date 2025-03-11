/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#3b82f6',
                secondary: '#6b7280',
                accent: '#f59e0b',
                error: '#ef4444',
                success: '#10b981',
            },
            spacing: {
                xs: '0.25rem',
                sm: '0.5rem',
                md: '1rem',
                lg: '1.5rem',
                xl: '2rem',
            },
            borderRadius: {
                sm: '0.25rem',
                md: '0.5rem',
                lg: '0.75rem',
            },
        },
    },
    plugins: [],
}
