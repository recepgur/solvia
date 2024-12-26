import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    // Check if the browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    // Check notification permission status
    setPermission(Notification.permission);

    // Check if service worker is already registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(sub => {
          setSubscription(sub);
        });
      });
    }
  }, []);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        
        // Get push subscription
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
        });

        setSubscription(sub);

        // TODO: Send subscription to backend
        // await fetch('/api/push-subscription', {
        //   method: 'POST',
        //   body: JSON.stringify(sub),
        //   headers: {
        //     'Content-Type': 'application/json'
        //   }
        // });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const unsubscribe = async () => {
    if (subscription) {
      try {
        await subscription.unsubscribe();
        setSubscription(null);
        
        // TODO: Remove subscription from backend
        // await fetch('/api/push-subscription', {
        //   method: 'DELETE',
        //   body: JSON.stringify(subscription),
        //   headers: {
        //     'Content-Type': 'application/json'
        //   }
        // });
      } catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{t('notifications.settings')}</h2>
      
      {!('Notification' in window) ? (
        <p className="text-red-500">{t('notifications.unsupported')}</p>
      ) : (
        <>
          <p className="mb-4">
            {t('notifications.status')}: {permission}
          </p>
          
          {permission === 'default' && (
            <button
              onClick={requestPermission}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {t('notifications.enable')}
            </button>
          )}
          
          {permission === 'granted' && (
            <div>
              <p className="mb-2">
                {subscription
                  ? t('notifications.subscribed')
                  : t('notifications.not_subscribed')}
              </p>
              
              <button
                onClick={subscription ? unsubscribe : requestPermission}
                className={`px-4 py-2 rounded ${
                  subscription
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                {subscription
                  ? t('notifications.disable')
                  : t('notifications.subscribe')}
              </button>
            </div>
          )}
          
          {permission === 'denied' && (
            <p className="text-red-500">
              {t('notifications.denied')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
