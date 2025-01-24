import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CallScreenProps } from '../../types/navigation';
import { theme } from '../../constants/theme';

type CallScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Call'>;

export default function CallScreen() {
  const route = useRoute<CallScreenProps['route']>();
  const navigation = useNavigation<CallScreenNavigationProp>();
  const { userId, isVideo } = route.params;
  
  // Temporary placeholder for call functionality
  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigation.goBack();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [navigation]);

  // Navigation handled by useEffect timer

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.message}>Call functionality is temporarily disabled</Text>
        <Text style={styles.submessage}>Returning to chat in 3 seconds...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  message: {
    fontSize: theme.typography.h2.fontSize,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  submessage: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
