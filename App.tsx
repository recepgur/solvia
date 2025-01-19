import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { api } from './src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { RootStackParamList } from './src/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking token:', error);
      } finally {
        setLoading(false);
      }
    };
    checkToken();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      if (response.data) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    try {
      await api.register(username, email, password);
      await handleLogin(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator>
            {!isAuthenticated ? (
              <Stack.Screen
                name="Auth"
                component={(props) => (
                  <AuthScreen
                    {...props}
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                  />
                )}
                options={{
                  title: 'Welcome',
                  headerStyle: {
                    backgroundColor: '#f4511e',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
              />
            ) : (
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{
                  title: 'Solvia',
                  headerStyle: {
                    backgroundColor: '#f4511e',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
              />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
