import React from 'react';
import { StyleSheet, View, Text, Image, Dimensions } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Listing, ItemCondition } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface CarCardProps {
  listing: Listing;
  onSwipe: (direction: 'left' | 'right') => void;
}

export const CarCard: React.FC<CarCardProps> = ({ listing, onSwipe }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    },
    onEnd: () => {
      if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
        runOnJS(onSwipe)(translateX.value > 0 ? 'right' : 'left');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-30, 0, 30]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <PanGestureHandler onGestureEvent={panGesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Image source={{ uri: listing.image_urls[0] }} style={styles.image} />
        <View style={styles.badges}>
          <View style={[
            styles.badge,
            { backgroundColor: listing.condition === ItemCondition.NEW ? '#22c55e' : '#eab308' }
          ]}>
            <Text style={styles.badgeText}>
              {listing.condition === ItemCondition.NEW ? 'NEW' : 'USED'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#64748b' }]}>
            <Text style={styles.badgeText}>
              {listing.category.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>${listing.price.toLocaleString()}</Text>
          <Text style={styles.description}>{listing.description}</Text>
          <Text style={styles.location}>
            Location: {listing.location.latitude.toFixed(2)}, {listing.location.longitude.toFixed(2)}
          </Text>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  badges: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    gap: 8,
    zIndex: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'absolute',
  },
  image: {
    width: '100%',
    height: 300,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    color: '#2196F3',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: '#999',
  },
});
