import React from 'react';
import WalletConnect from './components/WalletConnect';

function Login({ onLoginSuccess }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Solvia&apos;ya Hoş Geldiniz</h1>
          <p className="mt-2 text-sm text-gray-600">
            Devam etmek için cüzdanınızı bağlayın
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <WalletConnect 
            onWalletConnect={(walletType, account) => {
              onLoginSuccess(walletType, account);
            }} 
          />
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Cüzdan bağlantısı güvenli bir şekilde gerçekleştirilecektir</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
