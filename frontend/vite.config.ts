import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['stream', 'crypto', 'buffer', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    hmr: {
      clientPort: Number(process.env.HMR_PORT) || 443,
      host: process.env.HMR_HOST || 'localhost'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          wallet: ['@solana/web3.js', '@solana/wallet-adapter-react']
        }
      }
    }
  },
  define: {
    'process.env.VITE_SOLANA_NETWORK': JSON.stringify(process.env.VITE_SOLANA_NETWORK || 'devnet'),
    'process.env.VITE_SOLVIO_TOKEN_ADDRESS': JSON.stringify(process.env.VITE_SOLVIO_TOKEN_ADDRESS)
  }
})

