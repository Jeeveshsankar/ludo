import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import { Colors } from '../theme';

interface DiceProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  color?: string;
  size?: number;
}

export const Dice: React.FC<DiceProps> = ({
  value,
  isRolling,
  canRoll,
  onRoll,
  color = Colors.primaryPurple,
  size = 64,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRolling) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.12, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }
  }, [isRolling]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dot = <View key="dot" style={styles.dot} />;

  const renderDots = () => {
    if (!value || isRolling) {
      return <Text style={styles.rollingIcon}>🎲</Text>;
    }

    switch (value) {
      case 1:
        return (
          <View style={styles.centerContainer}>
            <View style={[styles.dot, styles.largeCenterDot, { backgroundColor: color }]} />
          </View>
        );
      case 2:
        return (
          <View style={styles.diagonalRow}>
            <View style={[styles.dot, { alignSelf: 'flex-start' }]} />
            <View style={[styles.dot, { alignSelf: 'flex-end' }]} />
          </View>
        );
      case 3:
        return (
          <View style={styles.diagonalRow}>
            <View style={[styles.dot, { alignSelf: 'flex-start' }]} />
            <View style={[styles.dot, { alignSelf: 'center' }]} />
            <View style={[styles.dot, { alignSelf: 'flex-end' }]} />
          </View>
        );
      case 4:
        return (
          <View style={styles.gridBox}>
            <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
            <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
          </View>
        );
      case 5:
        return (
          <View style={styles.gridBox}>
            <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
            <View style={styles.dotRow}><View style={styles.dot} /></View>
            <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
          </View>
        );
      case 6:
        return (
          <View style={styles.gridBox}>
            <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
            <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
            <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
          </View>
        );
      default:
        return <Text style={styles.fallbackNum}>{value}</Text>;
    }
  };

  return (
    <TouchableOpacity
      disabled={!canRoll || isRolling}
      onPress={onRoll}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.outerFrame,
          {
            width: size,
            height: size,
            borderColor: color,
            transform: [{ rotate: spin }, { scale: scaleAnim }],
            opacity: canRoll ? 1 : 0.75,
          },
        ]}
      >
        <View style={styles.innerSurface}>{renderDots()}</View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  outerFrame: {
    borderRadius: 16,
    borderWidth: 2.5,
    backgroundColor: '#FFFFFF',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerSurface: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E1B4B',
  },
  largeCenterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rollingIcon: {
    fontSize: 26,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diagonalRow: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    padding: 2,
  },
  gridBox: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-around',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  fallbackNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1B4B',
  },
});
