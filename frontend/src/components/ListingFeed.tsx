import { useState, useEffect } from 'react';
import { CategoryFilter } from './CategoryFilter';
import { ListingCard } from './ListingCard';
import { Category, Listing } from '../types';
import { listingsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ListingFeedProps {
  userLocation: { latitude: number; longitude: number };
}

export function ListingFeed({ userLocation }: ListingFeedProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user: _ } = useAuth(); // Keep auth context for future use

  useEffect(() => {
    if (userLocation) {
      fetchListings();
    }
  }, [userLocation, selectedCategory]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const filters = selectedCategory !== 'all' ? { category: selectedCategory } : undefined;
      const response = await listingsApi.getFeed(userLocation, filters);
      setListings(response.listings);
      setCurrentIndex(0);
      setError(null);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!listings[currentIndex]) return;

    try {
      await listingsApi.swipe(listings[currentIndex].id!, {
        action: direction === 'right' ? 'like' : 'dislike'
      });

      setCurrentIndex(prev => prev + 1);

      // Fetch more listings when running low
      if (currentIndex >= listings.length - 2) {
        fetchListings();
      }
    } catch (err) {
      console.error('Error recording swipe:', err);
      setError('Failed to record your choice. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-600">
          <p className="mb-2">Loading...</p>
          <p className="text-sm">Finding items near you</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />
      {listings.length > currentIndex ? (
        <ListingCard
          listing={listings[currentIndex]}
          onSwipe={handleSwipe}
        />
      ) : (
        <div className="text-center text-gray-600">
          No more items to show in this category.
        </div>
      )}
    </div>
  );
}
