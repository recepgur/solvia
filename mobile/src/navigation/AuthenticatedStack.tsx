import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatScreen from '../screens/ChatScreen';
import ChatListScreen from '../screens/ChatListScreen';
import CallScreen from '../screens/CallScreen';
import GroupScreen from '../screens/GroupScreen';
import { theme } from '../constants/theme';
import { RootStackParamList } from '../types/navigation';

type Props = {
  Stack: ReturnType<typeof createNativeStackNavigator<RootStackParamList>>;
};

export function AuthenticatedStack({ Stack }: Props) {
  return (
    <>
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ 
          title: 'TChat'
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Sohbet' }}
      />
      <Stack.Screen
        name="Call"
        component={CallScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Group"
        component={GroupScreen}
        options={{ title: 'Gruplar' }}
      />
    </>
  );
}
