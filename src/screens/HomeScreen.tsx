import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { CarCard } from '../components/CarCard';
import { api } from '../services/api';
import { CarListing, Location } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';

export const HomeScreen: React.FC = () => {
  const [listings, setListings] = useState<CarListing[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const granted = await Geolocation.requestAuthorization('whenInUse');
      if (granted === 'granted') {
        getCurrentLocation();
      } else {
        setError('Location permission denied');
        setLoading(false);
      }
    } catch (err) {
      setError('Error requesting location permission');
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      async (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        fetchListings(location);
      },
      (error) => {
        console.error(error);
        setError('Error getting location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const fetchListings = async (location: Location) => {
    try {
      const response = await api.getNearbyListings(location);
      if (response.data) {
        setListings(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch listings');
      }
    } catch (err) {
      setError('Error fetching listings');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!listings[currentIndex]) return;

    const action = direction === 'right' ? 'like' : 'dislike';
    try {
      await api.swipeListing(listings[currentIndex].id!, {
        user_id: 'test-user',
        action,
      });

      setCurrentIndex(prev => prev + 1);

      // Fetch more listings when running low
      if (currentIndex >= listings.length - 2) {
        getCurrentLocation();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to record your choice');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Finding cars near you...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (listings.length === 0 || currentIndex >= listings.length) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noListingsText}>No more cars to show!</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cardContainer}>
        <CarCard
          listing={listings[currentIndex]}
          onSwipe={handleSwipe}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  noListingsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
