/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Hebrew/RTL support
      fontFamily: {
        'hebrew': ['"Noto Sans Hebrew"', 'Arial', 'sans-serif'],
        'system': ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto'],
      },
      // Custom colors for the theological text editor
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Hebrew text colors
        torah: {
          50: '#fdfdf9',
          100: '#faf9f2',
          200: '#f4f1e6',
          300: '#ebe6d3',
          400: '#ddd4bb',
          500: '#cbbf9f',
          600: '#b5a587',
          700: '#9b8b6f',
          800: '#7f725c',
          900: '#695e4c',
        }
      },
      // Spacing for Hebrew text
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      // Text sizes optimized for Hebrew
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.6' }],
        'base': ['1rem', { lineHeight: '1.7' }],
        'lg': ['1.125rem', { lineHeight: '1.8' }],
        'xl': ['1.25rem', { lineHeight: '1.8' }],
        '2xl': ['1.5rem', { lineHeight: '1.9' }],
      },
    },
  },
  plugins: [
    // Add plugins for forms, typography, etc.
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
  // RTL support
  corePlugins: {
    direction: true,
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
};