/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#13ec6d",
                "background-light": "#f6f8f7",
                "background-dark": "#102218",
                "surface-dark": "#1a2e23",
                "neutral-dark": "#1a2e23",
                "neutral-dark-v2": "#2d4236",
                "neutral-border": "#213d2d",
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"]
            },
        },
    },
    plugins: [],
}
