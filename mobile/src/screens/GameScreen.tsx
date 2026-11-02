import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useAppStore } from '../store/gameStore';
import { LudoBoard } from '../components/LudoBoard';
import { Dice } from '../components/Dice';
import { Colors } from '../theme';
import { Player, Token } from '../engine/LudoEngineTS';

export const GameScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const {
    gameMode,
    gameState,
    onlineRoom,
    user,
    rollLocalDice,
    moveLocalToken,
    rollOnlineDice,
    moveOnlineToken,
    resetLocalGame,
    leaveOnlineRoom,
    setScreen,
  } = useAppStore();

  const isOnline = gameMode === 'online' && onlineRoom !== null;

  // Prepare standard Player[] format whether offline or online
  let playersList: Player[] = [];
  let activePlayerColor = 'red';
  let activePlayerName = 'Player 1';
  let legalTokens: number[] = [];
  let diceValue: number | null = null;
  let canRoll = false;
  let lastNotice = '';
  let version = 1;

  if (isOnline && onlineRoom) {
    const pArr = Object.values(onlineRoom.players);
    playersList = pArr.map((rp) => ({
      id: rp.user_id,
      name: rp.username,
      avatar: 'avatar_1',
      color: rp.color,
      seat: rp.seat,
      tokens: rp.tokens as Token[],
    }));

    const currentTurnUid = onlineRoom.turn_order[onlineRoom.current_turn_index];
    const activePl = onlineRoom.players[currentTurnUid];
    if (activePl) {
      activePlayerColor = activePl.color;
      activePlayerName = activePl.username;
    }

    diceValue = onlineRoom.dice_value;
    const isMyTurn = currentTurnUid === user?.id;
    canRoll = isMyTurn && !onlineRoom.dice_rolled && onlineRoom.status === 'in_game';
    legalTokens = isMyTurn ? onlineRoom.legal_tokens : [];
    version = onlineRoom.version;

    if (onlineRoom.status === 'finished') {
      lastNotice = `🎉 Match Finished! Winner: ${onlineRoom.winner_id}`;
    } else if (onlineRoom.dice_rolled) {
      lastNotice = `${activePlayerName} rolled a ${diceValue}!`;
    } else {
      lastNotice = `${activePlayerName}'s Turn`;
    }
  } else if (gameState) {
    playersList = gameState.players;
    const active = gameState.players[gameState.currentTurnIndex];
    activePlayerColor = active.color;
    activePlayerName = active.name;
    diceValue = gameState.diceValue;
    canRoll = gameState.turnStatus === 'awaiting_roll';
    legalTokens = gameState.legalTokenIds;
    lastNotice = gameState.lastMoveNotice || `${activePlayerName}'s Turn`;
    version = gameState.version;
  }

  if (playersList.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No Active Game</Text>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => setScreen('Home')}
          >
            <Text style={styles.btnText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isLandscape = width > height;
  const boardSize = isLandscape
    ? Math.min(height - 40, width * 0.55)
    : Math.min(width - 24, height * 0.62, 420);

  const handleRoll = () => {
    if (isOnline) {
      rollOnlineDice();
    } else {
      rollLocalDice();
    }
  };

  const handleTokenPress = (tokenId: number) => {
    if (isOnline) {
      moveOnlineToken(tokenId);
    } else {
      moveLocalToken(tokenId);
    }
  };

  const handleExit = () => {
    if (isOnline) {
      leaveOnlineRoom();
    } else {
      resetLocalGame();
    }
    setScreen('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.exitBtn}>
          <Text style={styles.exitBtnText}>✕ Exit</Text>
        </TouchableOpacity>

        <View style={styles.titleCenter}>
          <Text style={styles.brandTitle}>HEYSAKHI LUDO</Text>
          <Text style={styles.modeBadge}>
            {isOnline ? `ONLINE ROOM: ${onlineRoom?.code}` : 'OFFLINE PASS & PLAY'}
          </Text>
        </View>

        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v{version}</Text>
        </View>
      </View>

      {/* 2. Compact Turn Indicator Banner */}
      <View style={styles.turnIndicatorBar}>
        <View
          style={[
            styles.turnColorDot,
            { backgroundColor: (Colors as any)[activePlayerColor] || Colors.primaryPurple },
          ]}
        />
        <Text style={styles.turnNoticeText}>{lastNotice}</Text>
      </View>

      {/* 3. Responsive 15x15 Ludo Board */}
      <View style={styles.boardWrapper}>
        <LudoBoard
          players={playersList}
          activePlayerColor={activePlayerColor as any}
          legalTokenIds={legalTokens}
          onTokenPress={handleTokenPress}
          size={boardSize}
        />
      </View>

      {/* 4. Bottom Control Panel */}
      <View style={styles.controlPanel}>
        <View style={styles.playerMetaRow}>
          <View
            style={[
              styles.playerAvatar,
              { backgroundColor: (Colors as any)[activePlayerColor] || Colors.primaryPurple },
            ]}
          >
            <Text style={styles.avatarInitial}>
              {activePlayerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.playerName}>{activePlayerName}</Text>
            <Text
              style={[
                styles.playerTeamLabel,
                { color: (Colors as any)[activePlayerColor] || Colors.primaryPurple },
              ]}
            >
              {activePlayerColor.toUpperCase()} TEAM
            </Text>
          </View>
        </View>

        {/* Dice Area */}
        <View style={styles.diceSection}>
          <Dice
            value={diceValue}
            isRolling={useAppStore.getState().isRolling}
            canRoll={canRoll}
            onRoll={handleRoll}
            color={(Colors as any)[activePlayerColor] || Colors.primaryPurple}
            size={58}
          />
          <Text style={styles.diceTip}>
            {canRoll ? 'TAP TO ROLL' : isOnline && !canRoll ? 'WAITING...' : 'SELECT TOKEN'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pageBackground || '#F8F9FE',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark || '#1E1B4B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gridLine || '#E2E4F0',
  },
  exitBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.softLavender || '#F3E8FF',
  },
  exitBtnText: {
    color: Colors.primaryPurple || '#7C3AED',
    fontSize: 13,
    fontWeight: '700',
  },
  titleCenter: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textDark || '#1E1B4B',
    letterSpacing: 1.5,
  },
  modeBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.accentPink,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  versionBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FE',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted || '#6B7280',
  },
  turnIndicatorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gridLine || '#E2E4F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  turnColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  turnNoticeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark || '#1E1B4B',
  },
  boardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  controlPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.gridLine || '#E2E4F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark || '#1E1B4B',
  },
  playerTeamLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  diceSection: {
    alignItems: 'center',
  },
  diceTip: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted || '#6B7280',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  btnPrimary: {
    marginTop: 16,
    backgroundColor: Colors.primaryPurple || '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
