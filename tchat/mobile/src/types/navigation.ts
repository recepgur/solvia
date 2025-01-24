import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  ChatList: undefined;
  Chat: {
    conversationId: string;
  };
  Call: {
    userId: string;
    isVideo: boolean;
  };
  Status: undefined;
  Settings: undefined;
  Group: {
    groupId?: string;
  };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

export type ChatScreenProps = RootStackScreenProps<'Chat'>;
export type CallScreenProps = RootStackScreenProps<'Call'>;
export type StatusScreenProps = RootStackScreenProps<'Status'>;
export type SettingsScreenProps = RootStackScreenProps<'Settings'>;
export type LoginScreenProps = RootStackScreenProps<'Login'>;
export type ChatListScreenProps = RootStackScreenProps<'ChatList'>;
export type GroupScreenProps = RootStackScreenProps<'Group'>;
