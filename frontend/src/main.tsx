import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializePolyfills } from './polyfills';
import '@solana/wallet-adapter-react-ui/styles.css';
import './styles/wallet-adapter.css';

const renderApp = async () => {
  try {
    // Ensure polyfills are initialized before rendering
    await initializePolyfills();
    
    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found');
    }

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize application:', error);
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = 'Failed to load application. Please refresh the page.';
    document.body.appendChild(errorDiv);
  }
};

renderApp();
