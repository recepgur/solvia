import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from '../screens/LoginScreen';
import { theme } from '../constants/theme';
import { WalletProvider } from '../contexts/WalletContext';
import { RootStackParamList } from '../types/navigation';
import { AuthenticatedStack } from './AuthenticatedStack';

// RootStackParamList is now imported from types/navigation

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    text: theme.colors.text,
    card: theme.colors.background,
    border: theme.colors.border,
    notification: theme.colors.primary,
  }
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <WalletProvider>
          {({ wallet, loading }) => (
            <Stack.Navigator
              screenOptions={{
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.background,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              {!wallet ? (
                <Stack.Screen
                  name="Login"
                  component={LoginScreen}
                  options={{ headerShown: false }}
                />
              ) : (
                <AuthenticatedStack Stack={Stack} />
              )}
            </Stack.Navigator>
          )}
        </WalletProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
