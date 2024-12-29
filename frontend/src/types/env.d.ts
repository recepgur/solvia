/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_RPC_URL: string
  readonly VITE_NETWORK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
