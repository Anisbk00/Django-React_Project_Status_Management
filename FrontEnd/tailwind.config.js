/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import aspectRatio from '@tailwindcss/aspect-ratio';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'status-green': '#4CAF50',
        'status-yellow': '#FFC107',
        'status-red': '#F44336',
      }
    },
  },
  plugins: [
    forms,
    typography,
    aspectRatio,
  ],
};
