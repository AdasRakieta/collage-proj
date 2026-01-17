/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        // Apple Maps Dark Theme Colors (iOS style) - Flattened for Tailwind
        'apple-dark-bg-primary': '#1c1c1e',
        'apple-dark-bg-secondary': '#2c2c2e',
        'apple-dark-bg-tertiary': '#3a3a3c',
        'apple-dark-bg-overlay': '#1c1c1e',
        
        'apple-dark-border-default': '#38383a',
        'apple-dark-border-subtle': '#48484a',
        
        'apple-dark-text-primary': '#ffffff',
        'apple-dark-text-secondary': '#98989d',
        'apple-dark-text-tertiary': '#636366',
        
        'apple-dark-accent-blue': '#0a84ff',
        'apple-dark-accent-green': '#30d158',
        'apple-dark-accent-red': '#ff453a',
        'apple-dark-accent-orange': '#ff9f0a',
        'apple-dark-accent-purple': '#bf5af2',
        
        // Light mode colors (keep existing iOS light) - Flattened
        'apple-light-bg-primary': '#ffffff',
        'apple-light-bg-secondary': '#f2f2f7',
        'apple-light-bg-tertiary': '#e5e5ea',
        
        'apple-light-border-default': '#d1d1d6',
        'apple-light-border-subtle': '#e5e5ea',
        
        'apple-light-text-primary': '#000000',
        'apple-light-text-secondary': '#3c3c43',
        'apple-light-text-tertiary': '#8e8e93',
        
        'apple-light-accent-blue': '#007aff',
        'apple-light-accent-green': '#34c759',
        'apple-light-accent-red': '#ff3b30',
        'apple-light-accent-orange': '#ff9500',
        'apple-light-accent-purple': '#af52de',
        // GitHub Dark Theme Colors (keep for backward compatibility)
        gh: {
          bg: {
            primary: '#1c1c1e',    // Main background (was #0d1117)
            secondary: '#2c2c2e',  // Cards, panels (was #161b22)
            tertiary: '#1c1c1e',   // Inner boxes (was #21262d)
            overlay: '#2c2c2e',    // Modals (was #1c2128)
            inset: '#1c1c1e',      // Inset areas (was #010409)
          },
          border: {
            default: '#38383a',    // Default borders (was #30363d)
            muted: '#38383a',      // Subtle borders (was #21262d)
          },
          text: {
            primary: '#ffffff',    // Main text (was #e6edf3)
            secondary: '#98989d',  // Secondary text (was #7d8590)
            link: '#0a84ff',       // Links (was #58a6ff)
            success: '#30d158',    // Success (was #3fb950)
            danger: '#ff453a',     // Danger (was #f85149)
            warning: '#ff9f0a',    // Warning (was #d29922)
          },
          accent: {
            primary: '#0a84ff',    // Primary accent blue (was #58a6ff)
            emphasis: '#0a84ff',   // Emphasized blue (was #1f6feb)
            success: '#30d158',    // Success green (was #238636)
            danger: '#ff453a',     // Danger red (was #da3633)
          },
          button: {
            primary: {
              bg: '#30d158',
              hover: '#2ea043',
              border: '#30d158',
            },
            secondary: {
              bg: '#38383a',
              hover: '#1c1c1e',
              border: '#38383a',
            },
          },
        },
      },
      fontFamily: {
        'github': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Noto Sans', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'gh': '6px',
        'gh-lg': '12px',
      },
      boxShadow: {
        'gh': '0 0 0 1px #30363d, 0 16px 32px rgba(1, 4, 9, 0.85)',
        'gh-lg': '0 0 0 1px #30363d, 0 24px 48px rgba(1, 4, 9, 0.9)',
      },
    },
  },
  plugins: [],
}
