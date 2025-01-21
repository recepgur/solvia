import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useWallet } from '../../contexts/WalletContext';
import ApiService from '../../services/api';
import { theme } from '../../constants/theme';

interface Group {
  id: string;
  name: string;
  members: string[];
  created_at: string;
}

export default function GroupScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const { wallet } = useWallet();

  useEffect(() => {
    fetchGroups();
  }, [wallet]);

  const fetchGroups = async () => {
    try {
      if (!wallet) return;
      const response = await ApiService.get('/api/v1/groups');
      setGroups(response);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    try {
      if (!wallet || !newGroupName.trim()) return;

      const members = newMemberAddress.split(',').map(addr => addr.trim()).filter(Boolean);
      
      await ApiService.post('/api/v1/groups/create', {
        name: newGroupName.trim(),
        members,
      });

      setNewGroupName('');
      setNewMemberAddress('');
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity 
      style={styles.groupContainer}
      onPress={() => {/* TODO: Navigate to group chat */}}
    >
      <Text style={styles.groupName}>{item.name}</Text>
      <Text style={styles.memberCount}>
        {item.members.length} members
      </Text>
      <Text style={styles.timestamp}>
        Created {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading groups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.createGroupContainer}>
        <TextInput
          style={styles.input}
          value={newGroupName}
          onChangeText={setNewGroupName}
          placeholder="Group name"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          value={newMemberAddress}
          onChangeText={setNewMemberAddress}
          placeholder="Member addresses (comma-separated)"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
        />
        <TouchableOpacity
          style={[styles.createButton, !newGroupName.trim() && styles.createButtonDisabled]}
          onPress={createGroup}
          disabled={!newGroupName.trim()}
        >
          <Text style={styles.createButtonText}>Create Group</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No groups yet</Text>
          </View>
        )}
      />
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
  createGroupContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  input: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  createButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
  },
  groupContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  groupName: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  memberCount: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  timestamp: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
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
});
