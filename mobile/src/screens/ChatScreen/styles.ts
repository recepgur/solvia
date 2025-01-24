import { StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E4DDD6', // Updated WhatsApp chat background color
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: '#075E54', // WhatsApp green
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: 'bold',
    color: '#075E54',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: 'bold',
    color: theme.colors.background,
  },
  headerStatus: {
    fontSize: theme.typography.caption.fontSize,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  callButtonsContainer: {
    flexDirection: 'row',
  },
  callButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  callButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.body.fontSize,
  },
  messageList: {
    flex: 1,
    paddingVertical: theme.spacing.md,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  errorText: {
    color: theme.colors.background,
    fontSize: theme.typography.body.fontSize,
  },
});
