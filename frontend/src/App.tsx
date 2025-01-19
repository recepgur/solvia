import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { ListingFeed } from './components/ListingFeed';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Get user's location
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      // Default to Istanbul coordinates
      setUserLocation({ latitude: 41.0082, longitude: 28.9784 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        setError('Unable to get your location. Showing listings near Istanbul.');
        // Default to Istanbul coordinates
        setUserLocation({ latitude: 41.0082, longitude: 28.9784 });
      }
    );
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100">
      {authLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center text-gray-600">
            <p className="mb-2">Loading...</p>
          </div>
        </div>
      ) : !user ? (
        <AuthScreen />
      ) : (
        <div className="max-w-md mx-auto p-4">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Solvia</h1>
          
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800">{error}</p>
            </div>
          )}
          
          {userLocation ? (
            <ListingFeed userLocation={userLocation} />
          ) : (
            <div className="text-center text-gray-600">
              Getting your location...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
