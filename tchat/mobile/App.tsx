import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from '@navigation';
import 'react-native-get-random-values';

export default function App() {
  return (
    <SafeAreaProvider>
      <Navigation />
    </SafeAreaProvider>
  );
}
