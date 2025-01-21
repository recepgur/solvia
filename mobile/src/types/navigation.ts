import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Chat: undefined;
  Call: {
    userId: string;
    isVideo: boolean;
  };
  Status: undefined;
  Settings: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

export type ChatScreenProps = RootStackScreenProps<'Chat'>;
export type CallScreenProps = RootStackScreenProps<'Call'>;
export type StatusScreenProps = RootStackScreenProps<'Status'>;
export type SettingsScreenProps = RootStackScreenProps<'Settings'>;
