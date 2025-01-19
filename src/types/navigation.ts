import { StackScreenProps } from '@react-navigation/stack';

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
};

export type AuthScreenProps = StackScreenProps<RootStackParamList, 'Auth'> & {
  onLogin: (email: string, password: string) => void;
  onRegister: (username: string, email: string, password: string) => void;
};

export type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;
