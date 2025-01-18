import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") }
    ]
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
})

