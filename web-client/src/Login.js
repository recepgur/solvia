import React, { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import { getMessage } from './utils/language';
import LanguageToggle from './components/LanguageToggle';

function Login({ onLoginSuccess }) {
  const [currentLanguage, setCurrentLanguage] = useState('tr');
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 px-4 sm:px-6 py-8 sm:py-12">
      <div className="absolute top-4 right-4">
        <LanguageToggle
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />
      </div>
      <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-2xl transition-all duration-300">
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              {getMessage('IMPORTANT_WALLET_REQUIRED')}
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              {getMessage('NO_WALLET')}
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mt-10">
          <WalletConnect 
            onWalletConnect={(walletType, account) => {
              onLoginSuccess(walletType, account);
            }} 
          />
        </div>

        <div className="mt-6 sm:mt-8 text-center">
          <div className="flex items-center justify-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm sm:text-base font-medium text-gray-700">
              {getMessage('SECURE_WALLET_CONNECTION')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
