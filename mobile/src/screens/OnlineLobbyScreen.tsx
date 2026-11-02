import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme';
import { useAppStore } from '../store/gameStore';

export const OnlineLobbyScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const {
    currentScreen,
    setScreen,
    onlineRoom,
    onlineError,
    isSearchingMatch,
    createOnlineRoom,
    joinOnlineRoom,
    joinQuickMatch,
    cancelMatchmaking,
    toggleReady,
    startOnlineGame,
    leaveOnlineRoom,
  } = useAppStore();

  const [capacity, setCapacity] = useState<number>(4);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('SakhiPlayer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. ONLINE MODE SELECTION SCREEN (Create, Join, Quick Match)
  if (currentScreen === 'OnlineMode') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('Home')} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ONLINE MULTIPLAYER</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.userBar}>
            <Text style={styles.userBarLabel}>Player Name:</Text>
            <TextInput
              style={styles.userNameInput}
              value={usernameInput}
              onChangeText={setUsernameInput}
              placeholder="Your name"
            />
          </View>

          {onlineError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{onlineError}</Text>
            </View>
          )}

          {/* Option A: Create Private Room */}
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setScreen('CreateRoom')}
            activeOpacity={0.8}
          >
            <View style={styles.modeIconCircle}>
              <Text style={styles.modeIcon}>👑</Text>
            </View>
            <View style={styles.modeMeta}>
              <Text style={styles.modeTitle}>Create Private Room</Text>
              <Text style={styles.modeSubtitle}>
                Host a custom match with 2, 3, or 4 players & get a shareable code.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option B: Join Private Room */}
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setScreen('JoinRoom')}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.modeIcon}>🔑</Text>
            </View>
            <View style={styles.modeMeta}>
              <Text style={styles.modeTitle}>Join With Room Code</Text>
              <Text style={styles.modeSubtitle}>
                Enter a 6-character room code shared by your friend.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option C: Quick Match */}
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setScreen('Matchmaking')}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: '#D1FAE5' }]}>
              <Text style={styles.modeIcon}>⚡</Text>
            </View>
            <View style={styles.modeMeta}>
              <Text style={styles.modeTitle}>Quick Match (Matchmaking)</Text>
              <Text style={styles.modeSubtitle}>
                Instantly connect with other players online.
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 2. CREATE ROOM SCREEN
  if (currentScreen === 'CreateRoom') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('OnlineMode')} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CREATE ROOM</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>Select Player Capacity</Text>
            <View style={styles.capacityRow}>
              {[2, 3, 4].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.capTab, capacity === num && styles.capTabActive]}
                  onPress={() => setCapacity(num)}
                >
                  <Text style={[styles.capTabText, capacity === num && styles.capTabTextActive]}>
                    {num} Players
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {onlineError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{onlineError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.btnAction}
              disabled={isSubmitting}
              onPress={async () => {
                setIsSubmitting(true);
                await createOnlineRoom(capacity, usernameInput);
                setIsSubmitting(false);
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.btnActionText}>GENERATE ROOM CODE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 3. JOIN ROOM SCREEN
  if (currentScreen === 'JoinRoom') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('OnlineMode')} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>JOIN ROOM</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>Enter Room Code</Text>
            <TextInput
              style={styles.codeTextInput}
              placeholder="e.g. SAKHI8A"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              value={roomCodeInput}
              onChangeText={setRoomCodeInput}
            />

            {onlineError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{onlineError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.btnAction}
              disabled={isSubmitting}
              onPress={async () => {
                if (!roomCodeInput.trim()) return;
                setIsSubmitting(true);
                await joinOnlineRoom(roomCodeInput.trim(), usernameInput);
                setIsSubmitting(false);
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.btnActionText}>CONNECT TO ROOM</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 4. QUICK MATCHMAKING SCREEN
  if (currentScreen === 'Matchmaking') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={cancelMatchmaking} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MATCHMAKING</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={Colors.primaryPurple} />
          <Text style={styles.searchingTitle}>Searching for Players...</Text>
          <Text style={styles.searchingSubtitle}>Finding an open 2-player or 4-player match</Text>

          <TouchableOpacity
            style={[styles.btnAction, { marginTop: 24, backgroundColor: Colors.primaryPurple }]}
            onPress={() => joinQuickMatch(2, usernameInput)}
          >
            <Text style={styles.btnActionText}>SEARCH 2-PLAYER QUEUE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAction, { marginTop: 12, backgroundColor: Colors.accentPink }]}
            onPress={() => joinQuickMatch(4, usernameInput)}
          >
            <Text style={styles.btnActionText}>SEARCH 4-PLAYER QUEUE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 5. SYNCHRONIZED MULTIPLAYER LOBBY
  if (currentScreen === 'Lobby' && onlineRoom) {
    const playersList = Object.values(onlineRoom.players);
    const isHost = onlineRoom.host_id === (useAppStore.getState().user?.id);
    const allReady = playersList.length >= 2 && playersList.every((p) => p.is_ready);

    const handleShare = async () => {
      try {
        await Share.share({
          message: `Join my HeySakhi Ludo match! Room Code: ${onlineRoom.code}`,
        });
      } catch (err) {}
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={leaveOnlineRoom} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>✕ Leave</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ROOM LOBBY</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Room Code Card */}
          <View style={styles.roomCodeBanner}>
            <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
            <Text style={styles.roomCodeValue}>{onlineRoom.code}</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnText}>🔗 Share Invitation</Text>
            </TouchableOpacity>
          </View>

          {/* 4 Player Slots */}
          <Text style={styles.slotsHeader}>
            Players ({playersList.length}/{onlineRoom.capacity})
          </Text>

          <View style={styles.playersGrid}>
            {[0, 1, 2, 3].slice(0, onlineRoom.capacity).map((slotIdx) => {
              const player = playersList[slotIdx];
              if (player) {
                const colorHex = Colors[player.color] || Colors.primaryPurple;
                return (
                  <View key={`slot-${slotIdx}`} style={styles.playerCard}>
                    <View style={[styles.playerBadge, { backgroundColor: colorHex }]}>
                      <Text style={styles.playerInitial}>
                        {player.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.username}</Text>
                      <Text style={[styles.playerTeam, { color: colorHex }]}>
                        {player.color.toUpperCase()} TEAM {player.user_id === onlineRoom.host_id ? '★ (Host)' : ''}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.readyBadge,
                        { backgroundColor: player.is_ready ? '#D1FAE5' : '#FEE2E2' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.readyBadgeText,
                          { color: player.is_ready ? '#047857' : '#B91C1C' },
                        ]}
                      >
                        {player.is_ready ? 'READY' : 'WAITING'}
                      </Text>
                    </View>
                  </View>
                );
              }

              return (
                <View key={`empty-${slotIdx}`} style={styles.emptySlot}>
                  <Text style={styles.emptySlotText}>+ Waiting for Player...</Text>
                </View>
              );
            })}
          </View>

          {/* Host & Player Action Buttons */}
          <View style={styles.lobbyActions}>
            <TouchableOpacity
              style={[styles.btnAction, { backgroundColor: '#EDE9FE', marginBottom: 10 }]}
              onPress={toggleReady}
            >
              <Text style={[styles.btnActionText, { color: Colors.primaryPurple }]}>
                TOGGLE READY
              </Text>
            </TouchableOpacity>

            {isHost && (
              <TouchableOpacity
                style={[
                  styles.btnAction,
                  { backgroundColor: allReady ? Colors.accentPink : '#E2E4F0' },
                ]}
                disabled={!allReady}
                onPress={startOnlineGame}
              >
                <Text
                  style={[
                    styles.btnActionText,
                    { color: allReady ? '#FFFFFF' : '#9CA3AF' },
                  ]}
                >
                  {allReady ? 'START GAME' : 'WAITING FOR ALL PLAYERS'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pageBackground || '#F8F9FE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gridLine || '#E2E4F0',
  },
  headerBtn: {
    padding: 6,
  },
  headerBtnText: {
    color: Colors.primaryPurple || '#7C3AED',
    fontWeight: '700',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textDark || '#1E1B4B',
    letterSpacing: 1,
  },
  content: {
    padding: 16,
  },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gridLine || '#E2E4F0',
  },
  userBarLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark || '#1E1B4B',
    marginRight: 8,
  },
  userNameInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryPurple || '#7C3AED',
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.gridLine || '#E2E4F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  modeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.softLavender || '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modeIcon: {
    fontSize: 22,
  },
  modeMeta: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark || '#1E1B4B',
  },
  modeSubtitle: {
    fontSize: 11,
    color: Colors.textMuted || '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gridLine || '#E2E4F0',
  },
  cardSectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark || '#1E1B4B',
    marginBottom: 12,
  },
  capacityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  capTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F8F9FE',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gridLine || '#E2E4F0',
  },
  capTabActive: {
    backgroundColor: Colors.primaryPurple || '#7C3AED',
    borderColor: Colors.primaryPurple || '#7C3AED',
  },
  capTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted || '#6B7280',
  },
  capTabTextActive: {
    color: '#FFFFFF',
  },
  codeTextInput: {
    backgroundColor: '#F8F9FE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gridLine || '#E2E4F0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textDark || '#1E1B4B',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 20,
  },
  btnAction: {
    backgroundColor: Colors.accentPink || '#EC4899',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnActionText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  roomCodeBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryPurple || '#7C3AED',
    marginBottom: 16,
  },
  roomCodeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted || '#6B7280',
    letterSpacing: 1,
  },
  roomCodeValue: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.accentPink || '#EC4899',
    letterSpacing: 6,
    marginVertical: 4,
  },
  shareBtn: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.softLavender || '#F3E8FF',
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryPurple || '#7C3AED',
  },
  slotsHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark || '#1E1B4B',
    marginBottom: 10,
  },
  playersGrid: {
    gap: 10,
    marginBottom: 20,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gridLine || '#E2E4F0',
  },
  playerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark || '#1E1B4B',
  },
  playerTeam: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  readyBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  readyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptySlot: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.gridLine || '#E2E4F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  emptySlotText: {
    fontSize: 12,
    color: Colors.textMuted || '#6B7280',
    fontWeight: '600',
  },
  lobbyActions: {
    marginTop: 8,
  },
  searchingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark || '#1E1B4B',
    marginTop: 16,
  },
  searchingSubtitle: {
    fontSize: 12,
    color: Colors.textMuted || '#6B7280',
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
