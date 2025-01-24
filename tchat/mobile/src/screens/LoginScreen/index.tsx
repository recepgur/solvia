import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useWallet } from '../../contexts/WalletContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { theme } from '../../constants/theme';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { connect, loading, error } = useWallet();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      await connect();
      navigation.reset({
        index: 0,
        routes: [{ name: 'ChatList' }],
      });
    } catch (error: any) {
      console.error('Connection error:', error);
      // If the error indicates Phantom is not installed, open the install page
      if (error.message?.includes('install Phantom wallet')) {
        window.open('https://phantom.app', '_blank');
      }
    } finally {
      setConnecting(false);
    }
  };

  const getConnectionStatus = () => {
    if (connecting || loading) {
      return 'connecting';
    }
    if (error?.includes('not found')) {
      return 'not-installed';
    }
    if (error?.includes('rejected')) {
      return 'rejected';
    }
    if (error) {
      return 'error';
    }
    return 'ready';
  };

  const status = getConnectionStatus();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>TChat</Text>
        <Text style={styles.subtitle}>Merkeziyetsiz İletişim Platformu</Text>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {status === 'not-installed' && (
              <TouchableOpacity 
                style={styles.installButton}
                onPress={() => window.open('https://phantom.app', '_blank')}
              >
                <Text style={styles.installButtonText}>Phantom Cüzdanını Yükle</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity 
          style={[
            styles.connectButton, 
            status === 'connecting' && styles.connectButtonDisabled,
            status === 'not-installed' && styles.connectButtonHidden
          ]}
          onPress={handleConnect}
          disabled={status === 'connecting' || status === 'not-installed'}
        >
          <Text style={styles.connectButtonText}>
            {status === 'connecting' ? 'Bağlanıyor...' :
             status === 'rejected' ? 'Tekrar Dene' :
             status === 'error' ? 'Tekrar Bağlan' :
             'Cüzdanı Bağla'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.infoText}>
          {status === 'not-installed' ? 'Phantom cüzdanını yükleyin ve tekrar deneyin' :
           status === 'connecting' ? 'Phantom cüzdanı bağlantısı bekleniyor...' :
           status === 'rejected' ? 'Bağlantı reddedildi. Tekrar deneyin' :
           status === 'error' ? 'Bir hata oluştu. Tekrar deneyin' :
           'Devam etmek için Phantom cüzdanınızı bağlayın'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  installButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  installButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
  },
  connectButtonHidden: {
    display: 'none',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.h2.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  connectButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  connectButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
  },
  errorText: {
    color: theme.colors.error,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  infoText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
    fontSize: theme.typography.caption.fontSize,
  },
});
