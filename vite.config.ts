import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set the base path for GitHub Pages deployment.
  base: '/gemini-qa-app/',
  // This 'define' block makes the API key available to the app
  // as `process.env.API_KEY`, complying with the SDK guidelines.
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
