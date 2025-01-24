import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWallet } from '../../contexts/WalletContext';
import ApiService from '../../services/api';
import { theme } from '../../constants/theme';
import { RootStackParamList } from '../../types/navigation';

interface Group {
  id: string;
  name: string;
  members: string[];
  created_at: string;
}

type GroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Group'>;

export default function GroupScreen() {
  const navigation = useNavigation<GroupScreenNavigationProp>();
  const route = useRoute();
  const { groupId } = route.params as { groupId?: string };
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const { wallet } = useWallet();

  useEffect(() => {
    if (groupId) {
      // If groupId is provided, fetch specific group
      fetchGroup(groupId);
    } else {
      // Otherwise fetch all groups
      fetchGroups();
    }
  }, [wallet, groupId]);

  const fetchGroup = async (id: string) => {
    try {
      if (!wallet) return;
      const response = await ApiService.get(`/api/v1/groups/${id}`);
      setGroups([response]);
    } catch (error) {
      console.error('Error fetching group:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleGroupPress = (item: Group) => {
    if (item.id !== groupId) {
      navigation.push('Group', { groupId: item.id });
    }
  };

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity 
      style={styles.groupContainer}
      onPress={() => handleGroupPress(item)}
    >
      <View style={styles.groupItemAvatar}>
        <Text style={styles.groupItemAvatarText}>👥</Text>
      </View>
      <View style={styles.groupItemInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.memberCount}>
          {item.members.length} members • Created {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading groups...</Text>
      </View>
    );
  }

  const renderGroupDetails = (group: Group) => (
    <View style={styles.groupDetailsContainer}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{group.name}</Text>
        <Text style={styles.memberCount}>{group.members.length} Members</Text>
      </View>
      <View style={styles.memberList}>
        <Text style={styles.sectionTitle}>Members</Text>
        {group.members.map((member, index) => (
          <View key={index} style={styles.memberItem}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{member[0]}</Text>
            </View>
            <Text style={styles.memberAddress}>{member}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderGroupList = () => (
    <>
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
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {groupId && groups.length > 0 ? renderGroupDetails(groups[0]) : renderGroupList()}
    </View>
  );
}

const styles = StyleSheet.create({
  groupItemAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  groupItemAvatarText: {
    fontSize: 24,
    color: theme.colors.background,
  },
  groupItemInfo: {
    flex: 1,
  },
  groupDetailsContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  groupHeader: {
    marginBottom: theme.spacing.xl,
  },
  groupTitle: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  memberCount: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  memberList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  memberAvatarText: {
    color: theme.colors.background,
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
  },
  memberAddress: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
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
  // Removed duplicate memberCount style
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
