import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text } from 'react-native';

import ChatScreen from '../screens/ChatScreen';
import CallScreen from '../screens/CallScreen';
import GroupScreen from '../screens/GroupScreen';
import { theme } from '../constants/theme';
import { WalletProvider } from '../contexts/WalletContext';

export type RootStackParamList = {
  Chat: undefined;
  Status: undefined;
  Settings: undefined;
  Call: { userId: string; isVideo: boolean };
  Group: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <WalletProvider>
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
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ navigation }) => ({
              title: 'TChat',
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Group')}
                  style={{ marginRight: theme.spacing.md }}
                >
                  <Text style={{ color: theme.colors.background }}>Groups</Text>
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen
            name="Group"
            component={GroupScreen}
            options={{ title: 'Groups' }}
          />
          <Stack.Screen
            name="Call"
            component={CallScreen}
            options={{ 
              title: 'Call',
              headerShown: false 
            }}
          />
        </Stack.Navigator>
      </WalletProvider>
    </NavigationContainer>
  );
}
