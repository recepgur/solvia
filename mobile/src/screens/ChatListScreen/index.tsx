import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChatListScreenProps } from '../../types/navigation';
import { useWallet } from '../../contexts/WalletContext';
import { theme } from '../../constants/theme';

type NavigationProp = ChatListScreenProps['navigation'];

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: number;
  unreadCount?: number;
  type: 'direct' | 'group';
  memberCount?: number;
}

const mockChats: Chat[] = [
  { 
    id: '1', 
    name: 'Alice', 
    lastMessage: 'Merhaba!',
    timestamp: Date.now() - 1000 * 60 * 5,
    unreadCount: 2,
    type: 'direct'
  },
  { 
    id: '2', 
    name: 'Bob', 
    lastMessage: 'Nasılsın?',
    timestamp: Date.now() - 1000 * 60 * 30,
    type: 'direct'
  },
  { 
    id: '3', 
    name: 'Proje Grubu', 
    lastMessage: 'Yeni proje hakkında konuşalım',
    timestamp: Date.now() - 1000 * 60 * 60,
    unreadCount: 5,
    type: 'group',
    memberCount: 8
  },
];

export default function ChatListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { wallet } = useWallet();
  const [chats, setChats] = useState<Chat[]>(mockChats);

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 1000 * 60) {
      return 'Şimdi';
    } else if (diff < 1000 * 60 * 60) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}d`;
    } else if (diff < 1000 * 60 * 60 * 24) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return `${hours}s`;
    } else {
      return new Date(timestamp).toLocaleDateString('tr-TR');
    }
  };

  const renderItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity 
      style={styles.chatRow}
      onPress={() => {
        if (item.type === 'group') {
          navigation.navigate('Group', { groupId: item.id });
        } else {
          navigation.navigate('Chat', { conversationId: item.id });
        }
      }}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.type === 'group' ? '👥' : item.name[0]}
        </Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage}>
            {item.type === 'group' && item.memberCount ? `${item.memberCount} üye • ` : ''}
            {item.lastMessage}
          </Text>
          {item.unreadCount ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz sohbet bulunmuyor</Text>
          </View>
        )}
      />
      <TouchableOpacity 
        style={styles.createGroupButton}
        onPress={() => navigation.navigate('Group')}
      >
        <Text style={styles.createGroupButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.sm,
  },
  chatRow: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: theme.colors.background,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  lastMessage: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  timestamp: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  unreadBadgeText: {
    color: theme.colors.background,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: 'bold',
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
    textAlign: 'center',
  },
  createGroupButton: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  createGroupButtonText: {
    fontSize: 24,
    color: theme.colors.background,
    fontWeight: 'bold',
  },
});
