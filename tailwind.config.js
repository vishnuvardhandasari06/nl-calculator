/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'ivory': '#FFF8E7',
                'primary-gold': '#D4AF37',
                'accent-maroon': '#800000',
                'highlight-red': '#B22222',
                'text-main': '#222222',
                'button-hover-gold': '#A67C00',
            },
            fontFamily: {
                'sans': ['Poppins', 'sans-serif'],
                'serif': ['Playfair Display', 'serif'],
            },
        },
    },
    plugins: [],
}
