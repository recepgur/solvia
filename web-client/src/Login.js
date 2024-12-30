import React from 'react';
import WalletConnect from './components/WalletConnect';
import { getMessage } from './utils/language';

function Login({ onLoginSuccess }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 px-6 py-12">
      <div className="w-full max-w-md transform overflow-hidden rounded-xl bg-white p-8 shadow-2xl transition-all duration-300 hover:shadow-xl">
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <h1 className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent">{getMessage('IMPORTANT_WALLET_REQUIRED')}</h1>
            <p className="text-base text-gray-600">
              {getMessage('NO_WALLET')}
            </p>
          </div>
        </div>

        <div className="mt-10">
          <WalletConnect 
            onWalletConnect={(walletType, account) => {
              onLoginSuccess(walletType, account);
            }} 
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-gray-500/90">{getMessage('SECURE_WALLET_CONNECTION')}</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
