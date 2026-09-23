import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing, radius } from '../../src/constants/theme';
import { UserProfile } from '../../src/types/user';
import { FriendItem } from '../../src/types/friendship';
import {
  getFriends,
  getPendingRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from '../../src/services/friendService';
import { EmptyState } from '../../src/components/EmptyState';

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load mutual friends and pending requests
  const loadSocialData = useCallback(async () => {
    if (!user) return;
    try {
      const [friendsList, pending] = await Promise.all([
        getFriends(user.uid),
        getPendingRequests(user.uid),
      ]);
      setFriends(friendsList);
      setIncomingRequests(pending.incoming);
      setOutgoingRequests(pending.outgoing);
    } catch (err) {
      console.error('Failed to load friends data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadSocialData();
  }, [loadSocialData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSocialData();
  };

  // Perform N-gram search when search query changes (>= 3 chars)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3 || !user) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(trimmed, user.uid);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleSendRequest = async (targetUid: string) => {
    if (!user) return;
    setActionLoadingId(targetUid);
    try {
      await sendFriendRequest(user.uid, targetUid);
      await loadSocialData();
    } catch (err: any) {
      console.error('Failed to send friend request:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    setActionLoadingId(friendshipId);
    try {
      await acceptFriendRequest(friendshipId);
      await loadSocialData();
    } catch (err) {
      console.error('Failed to accept friend request:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    setActionLoadingId(friendshipId);
    try {
      await declineFriendRequest(friendshipId);
      await loadSocialData();
    } catch (err) {
      console.error('Failed to decline friend request:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const isFriend = (uid: string) => friends.some((f) => f.friendUid === uid);
  const isIncoming = (uid: string) => incomingRequests.some((r) => r.friendUid === uid);
  const isOutgoing = (uid: string) => outgoingRequests.some((r) => r.friendUid === uid);

  return (
    <View style={styles.screen}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search friends by name or username"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          inputStyle={{ color: colors.textPrimary }}
          placeholderTextColor={colors.textSecondary}
          iconColor={colors.textSecondary}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
          />
        }
      >
        {/* Search Results Mode */}
        {searchQuery.trim().length >= 3 ? (
          <View>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {isSearching ? (
              <ActivityIndicator
                color={colors.accentSocial}
                style={{ marginVertical: spacing.lg }}
              />
            ) : searchResults.length === 0 ? (
              <EmptyState
                icon="search-outline"
                title="No users found"
                subtitle="Try searching with a different name or username"
              />
            ) : (
              searchResults.map((userItem) => {
                const alreadyFriend = isFriend(userItem.uid);
                const hasIncoming = isIncoming(userItem.uid);
                const hasOutgoing = isOutgoing(userItem.uid);
                const actionBusy = actionLoadingId === userItem.uid;

                return (
                  <View key={userItem.uid} style={styles.friendCard}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(userItem.display_name || userItem.username || 'U')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>
                        {userItem.display_name || userItem.username}
                      </Text>
                      <Text style={styles.friendUsername}>@{userItem.username}</Text>
                    </View>
                    {alreadyFriend ? (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Friends</Text>
                      </View>
                    ) : hasIncoming ? (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Requested</Text>
                      </View>
                    ) : hasOutgoing ? (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Sent</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.addButton}
                        disabled={actionBusy}
                        onPress={() => handleSendRequest(userItem.uid)}
                      >
                        {actionBusy ? (
                          <ActivityIndicator size="small" color={colors.accentSocial} />
                        ) : (
                          <Text style={styles.addButtonText}>Add</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* Normal Friends & Requests Mode */
          <View>
            {/* Incoming Requests */}
            {incomingRequests.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Friend Requests</Text>
                {incomingRequests.map((req) => {
                  const busy = actionLoadingId === req.friendshipId;
                  return (
                    <View key={req.friendshipId} style={styles.friendCard}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(req.friendProfile.display_name || req.friendProfile.username || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>
                          {req.friendProfile.display_name || req.friendProfile.username}
                        </Text>
                        <Text style={styles.friendUsername}>@{req.friendProfile.username}</Text>
                      </View>
                      <View style={styles.actionButtonsRow}>
                        <Pressable
                          style={[styles.smallButton, styles.acceptButton]}
                          disabled={busy}
                          onPress={() => handleAcceptRequest(req.friendshipId)}
                        >
                          <Text style={styles.acceptButtonText}>Accept</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.smallButton, styles.declineButton]}
                          disabled={busy}
                          onPress={() => handleDeclineRequest(req.friendshipId)}
                        >
                          <Text style={styles.declineButtonText}>Decline</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Requests</Text>
                {outgoingRequests.map((req) => (
                  <View key={req.friendshipId} style={styles.friendCard}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(req.friendProfile.display_name || req.friendProfile.username || 'U')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>
                        {req.friendProfile.display_name || req.friendProfile.username}
                      </Text>
                      <Text style={styles.friendUsername}>@{req.friendProfile.username}</Text>
                    </View>
                    <Pressable
                      style={[styles.smallButton, styles.declineButton]}
                      disabled={actionLoadingId === req.friendshipId}
                      onPress={() => handleDeclineRequest(req.friendshipId)}
                    >
                      <Text style={styles.declineButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Mutual Friends */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Mutual Friends {friends.length > 0 ? `(${friends.length})` : ''}
              </Text>
              {loading ? (
                <ActivityIndicator
                  color={colors.accentSocial}
                  style={{ marginVertical: spacing.lg }}
                />
              ) : friends.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="No friends yet"
                  subtitle="Search for other users by name or username to connect and share notes."
                />
              ) : (
                friends.map((item) => (
                  <Pressable
                    key={item.friendshipId}
                    style={styles.friendCard}
                    onPress={() =>
                      router.push({
                        pathname: '/friend/[id]',
                        params: { id: item.friendUid },
                      })
                    }
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(item.friendProfile.display_name || item.friendProfile.username || 'F')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>
                        {item.friendProfile.display_name || item.friendProfile.username}
                      </Text>
                      <Text style={styles.friendUsername}>@{item.friendProfile.username}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  searchBar: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSurfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    color: colors.accentSocial,
    fontSize: 16,
    fontWeight: '600',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  friendUsername: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  addButton: {
    backgroundColor: colors.bgSurfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.accentSocial,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.accentSocial,
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  smallButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: colors.bgSurfaceRaised,
    borderColor: colors.accentSocial,
  },
  acceptButtonText: {
    color: colors.accentSocial,
    fontSize: 13,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: colors.bgBase,
    borderColor: colors.borderHairline,
  },
  declineButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
