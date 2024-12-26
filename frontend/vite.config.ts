import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['crypto', 'stream', 'buffer', 'process', 'util', 'events', 'assert'],
      protocolImports: true,
      globals: {
        Buffer: true,
        global: true,
        process: true
      }
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
    strictPort: true,
    hmr: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'crypto-deps': ['crypto', 'buffer', 'events', 'stream', 'util']
        }
      }
    }
  },
  publicDir: 'public',
  define: {
    'process.env.VITE_SOLANA_NETWORK': JSON.stringify(process.env.VITE_SOLANA_NETWORK || 'devnet'),
    'process.env.VITE_SOLVIO_TOKEN_ADDRESS': JSON.stringify(process.env.VITE_SOLVIO_TOKEN_ADDRESS),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.VITE_MOCK_DATA': JSON.stringify(process.env.VITE_MOCK_DATA || 'false'),
    'process.env.VITE_SKIP_FEE': JSON.stringify(process.env.VITE_SKIP_FEE || 'true'),
    'global': 'globalThis'
  },
  optimizeDeps: {
    include: ['buffer', 'crypto-browserify', 'events', 'stream', 'util', 'browserify-sign/browser'],
    esbuildOptions: {
      target: 'esnext',
      supported: { 
        'import-meta': true 
      }
    }
  }
})

