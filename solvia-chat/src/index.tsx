import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SolanaWalletProvider } from './components/WalletProvider'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <SolanaWalletProvider>
      <App />
    </SolanaWalletProvider>
  </React.StrictMode>
)
