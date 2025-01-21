import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useWallet } from '../../contexts/WalletContext';
import ApiService from '../../services/api';
import { theme } from '../../constants/theme';

interface Status {
  id: string;
  content: string;
  wallet: string;
  timestamp: string;
  media_hash?: string;
  media_type?: string;
}

export default function StatusScreen() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const { wallet } = useWallet();

  useEffect(() => {
    fetchStatuses();
  }, [wallet]);

  const fetchStatuses = async () => {
    try {
      if (!wallet) return;
      
      const response = await ApiService.get(`/api/v1/status/list?wallet_address=${wallet}`);
      setStatuses(response);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (content: string) => {
    try {
      if (!wallet) return;
      
      await ApiService.post('/api/v1/status/share', {
        content,
        wallet,
      });
      
      fetchStatuses();
    } catch (error) {
      console.error('Error sharing status:', error);
    }
  };

  const renderStatus = ({ item }: { item: Status }) => (
    <View style={styles.statusContainer}>
      <Text style={styles.statusContent}>{item.content}</Text>
      <Text style={styles.statusTimestamp}>
        {new Date(item.timestamp).toLocaleString()}
      </Text>
      {item.media_hash && (
        <Text style={styles.mediaInfo}>
          Media: {item.media_type}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading statuses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={statuses}
        renderItem={renderStatus}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No statuses yet</Text>
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => handleShare('Hello from TChat!')}
      >
        <Text style={styles.shareButtonText}>Share Status</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statusContent: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
  statusTimestamp: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  mediaInfo: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  shareButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  shareButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
  },
});
