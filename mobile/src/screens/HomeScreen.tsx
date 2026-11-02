import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../theme';
import { useAppStore } from '../store/gameStore';
import { PlayerColor } from '../engine/LudoEngineTS';

export const HomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { startOfflineGame, setScreen } = useAppStore();
  const [offlinePlayersCount, setOfflinePlayersCount] = useState<2 | 3 | 4>(2);

  const handleStartOffline = (count: 2 | 3 | 4) => {
    let configs: { name: string; color: PlayerColor }[] = [];
    if (count === 2) {
      configs = [
        { name: 'Player 1', color: 'red' },
        { name: 'Player 2', color: 'yellow' },
      ];
    } else if (count === 3) {
      configs = [
        { name: 'Player 1', color: 'red' },
        { name: 'Player 2', color: 'green' },
        { name: 'Player 3', color: 'yellow' },
      ];
    } else {
      configs = [
        { name: 'Player 1', color: 'red' },
        { name: 'Player 2', color: 'green' },
        { name: 'Player 3', color: 'yellow' },
        { name: 'Player 4', color: 'blue' },
      ];
    }
    startOfflineGame(configs);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================== */}
        {/* A. HEADER — Clean, Minimal, Understated                        */}
        {/* ============================================================== */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>HEYSAKHI LUDO</Text>
          <Text style={styles.brandSubtitle}>Modern multiplayer classic</Text>
        </View>

        {/* ============================================================== */}
        {/* B. ONLINE MULTIPLAYER — Primary Action                          */}
        {/* ============================================================== */}
        <View style={styles.cardPrimary}>
          <View style={styles.cardTopRow}>
            <View style={styles.iconCircle}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75"
                  stroke="#7C3AED"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Live</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.sectionHeading}>Online Multiplayer</Text>
            <Text style={styles.sectionDescription}>
              Play with friends, wherever they are.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => setScreen('OnlineMode')}
            activeOpacity={0.88}
          >
            <Text style={styles.btnPrimaryText}>Play Online</Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* C. PASS & PLAY — Secondary Action                              */}
        {/* ============================================================== */}
        <View style={styles.cardSecondary}>
          <View style={styles.cardContent}>
            <Text style={styles.sectionHeading}>Pass & Play</Text>
            <Text style={styles.sectionDescription}>
              Enjoy a game together on one device.
            </Text>
          </View>

          {/* Clean Segmented Player Count Selector */}
          <View style={styles.segmentContainer}>
            {[2, 3, 4].map((count) => {
              const isSelected = offlinePlayersCount === count;
              return (
                <TouchableOpacity
                  key={count}
                  style={[styles.segmentTab, isSelected && styles.segmentTabActive]}
                  onPress={() => setOfflinePlayersCount(count as 2 | 3 | 4)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                    {count} Players
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => handleStartOffline(offlinePlayersCount)}
            activeOpacity={0.88}
          >
            <Text style={styles.btnSecondaryText}>
              Start Local Match
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* D. CAREER STATISTICS — Minimal, Compact Supporting Row          */}
        {/* ============================================================== */}
        <View style={styles.statsSection}>
          <Text style={styles.statsHeading}>Career Statistics</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>9</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Captures</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>75%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFD',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },

  // A. Header
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 6,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
    marginTop: 3,
  },

  // B. Online Multiplayer Card (Primary)
  cardPrimary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E8F2',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  cardContent: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
  },
  btnPrimary: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // C. Pass & Play Card (Secondary)
  cardSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E8F2',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#1E1B4B',
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '700',
  },

  // D. Career Statistics
  statsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#E8E8F2',
  },
  statsHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F1F5F9',
  },
});
