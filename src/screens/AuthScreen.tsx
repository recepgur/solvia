import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => void;
  onRegister: (username: string, email: string, password: string) => void;
}

export function AuthScreen({ onLogin, onRegister }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {isLogin ? (
          <LoginForm
            onSubmit={onLogin}
            onRegisterClick={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm
            onSubmit={onRegister}
            onLoginClick={() => setIsLogin(true)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
});
