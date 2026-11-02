import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Rect, Circle, Polygon, G, Path } from 'react-native-svg';
import { Player, Token, PlayerColor } from '../engine/LudoEngineTS';
import { Colors } from '../theme';

interface LudoBoardProps {
  players: Player[];
  activePlayerColor: PlayerColor;
  legalTokenIds: number[];
  onTokenPress: (tokenId: number) => void;
  size?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_BOARD_SIZE = Math.min(SCREEN_WIDTH - 24, 380);

export const LudoBoard: React.FC<LudoBoardProps> = ({
  players,
  activePlayerColor,
  legalTokenIds,
  onTokenPress,
  size = DEFAULT_BOARD_SIZE,
}) => {
  const cellSize = size / 15;

  // Star safe icon path generator
  const renderStar = (gx: number, gy: number, key: string) => {
    const cx = (gx + 0.5) * cellSize;
    const cy = (gy + 0.5) * cellSize;
    const r = cellSize * 0.38;
    return (
      <G key={key}>
        <Circle cx={cx} cy={cy} r={r} fill="#FEF3C7" stroke="#F59E0B" strokeWidth={1} />
        {/* SVG 5-point star */}
        <Polygon
          points={`
            ${cx},${cy - r * 0.75}
            ${cx + r * 0.22},${cy - r * 0.23}
            ${cx + r * 0.75},${cy - r * 0.23}
            ${cx + r * 0.32},${cy + r * 0.12}
            ${cx + r * 0.48},${cy + r * 0.65}
            ${cx},${cy + r * 0.32}
            ${cx - r * 0.48},${cy + r * 0.65}
            ${cx - r * 0.32},${cy + r * 0.12}
            ${cx - r * 0.75},${cy - r * 0.23}
            ${cx - r * 0.22},${cy - r * 0.23}
          `}
          fill="#F59E0B"
        />
      </G>
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Board Outer Frame */}
        <Rect
          x={0}
          y={0}
          width={size}
          height={size}
          fill="#FFFFFF"
          stroke={Colors.gridLine}
          strokeWidth={2}
          rx={12}
        />

        {/* ============================================================== */}
        {/* 1. FOUR CORNER QUADRANTS (6x6 each = 144x144 relative)         */}
        {/* ============================================================== */}
        
        {/* Green Home (Top-Left: 0..6, 0..6) */}
        <Rect
          x={0}
          y={0}
          width={6 * cellSize}
          height={6 * cellSize}
          fill={Colors.green}
          stroke={Colors.gridLine}
          strokeWidth={1}
          rx={8}
        />
        <Rect
          x={cellSize}
          y={cellSize}
          width={4 * cellSize}
          height={4 * cellSize}
          fill="#FFFFFF"
          rx={10}
        />
        {/* 4 Green Token Wells inside Home */}
        {[
          [1.8, 1.8], [3.8, 1.8],
          [1.8, 3.8], [3.8, 3.8],
        ].map(([wx, wy], i) => (
          <Circle
            key={`green-well-${i}`}
            cx={wx * cellSize}
            cy={wy * cellSize}
            r={cellSize * 0.6}
            fill={Colors.greenLight}
            stroke={Colors.green}
            strokeWidth={1.5}
          />
        ))}

        {/* Yellow Home (Top-Right: 9..15, 0..6) */}
        <Rect
          x={9 * cellSize}
          y={0}
          width={6 * cellSize}
          height={6 * cellSize}
          fill={Colors.yellow}
          stroke={Colors.gridLine}
          strokeWidth={1}
          rx={8}
        />
        <Rect
          x={10 * cellSize}
          y={cellSize}
          width={4 * cellSize}
          height={4 * cellSize}
          fill="#FFFFFF"
          rx={10}
        />
        {/* 4 Yellow Token Wells inside Home */}
        {[
          [10.8, 1.8], [12.8, 1.8],
          [10.8, 3.8], [12.8, 3.8],
        ].map(([wx, wy], i) => (
          <Circle
            key={`yellow-well-${i}`}
            cx={wx * cellSize}
            cy={wy * cellSize}
            r={cellSize * 0.6}
            fill={Colors.yellowLight}
            stroke={Colors.yellow}
            strokeWidth={1.5}
          />
        ))}

        {/* Red Home (Bottom-Left: 0..6, 9..15) */}
        <Rect
          x={0}
          y={9 * cellSize}
          width={6 * cellSize}
          height={6 * cellSize}
          fill={Colors.red}
          stroke={Colors.gridLine}
          strokeWidth={1}
          rx={8}
        />
        <Rect
          x={cellSize}
          y={10 * cellSize}
          width={4 * cellSize}
          height={4 * cellSize}
          fill="#FFFFFF"
          rx={10}
        />
        {/* 4 Red Token Wells inside Home */}
        {[
          [1.8, 10.8], [3.8, 10.8],
          [1.8, 12.8], [3.8, 12.8],
        ].map(([wx, wy], i) => (
          <Circle
            key={`red-well-${i}`}
            cx={wx * cellSize}
            cy={wy * cellSize}
            r={cellSize * 0.6}
            fill={Colors.redLight}
            stroke={Colors.red}
            strokeWidth={1.5}
          />
        ))}

        {/* Blue Home (Bottom-Right: 9..15, 9..15) */}
        <Rect
          x={9 * cellSize}
          y={9 * cellSize}
          width={6 * cellSize}
          height={6 * cellSize}
          fill={Colors.blue}
          stroke={Colors.gridLine}
          strokeWidth={1}
          rx={8}
        />
        <Rect
          x={10 * cellSize}
          y={10 * cellSize}
          width={4 * cellSize}
          height={4 * cellSize}
          fill="#FFFFFF"
          rx={10}
        />
        {/* 4 Blue Token Wells inside Home */}
        {[
          [10.8, 10.8], [12.8, 10.8],
          [10.8, 12.8], [12.8, 12.8],
        ].map(([wx, wy], i) => (
          <Circle
            key={`blue-well-${i}`}
            cx={wx * cellSize}
            cy={wy * cellSize}
            r={cellSize * 0.6}
            fill={Colors.blueLight}
            stroke={Colors.blue}
            strokeWidth={1.5}
          />
        ))}

        {/* ============================================================== */}
        {/* 2. TRACK GRID CELLS (15x15 complete grid for cross corridors) */}
        {/* ============================================================== */}

        {/* Top Corridor: Columns 6, 7, 8 and Rows 0..5 */}
        {[6, 7, 8].map((col) =>
          [0, 1, 2, 3, 4, 5].map((row) => {
            const isYellowHomeColumn = col === 7 && row >= 1;
            const isYellowStart = col === 8 && row === 1;
            const fillColor = isYellowHomeColumn
              ? Colors.yellow
              : isYellowStart
              ? Colors.yellowLight
              : '#FFFFFF';

            return (
              <Rect
                key={`cell-${col}-${row}`}
                x={col * cellSize}
                y={row * cellSize}
                width={cellSize}
                height={cellSize}
                fill={fillColor}
                stroke={Colors.gridLine}
                strokeWidth={1}
              />
            );
          })
        )}

        {/* Bottom Corridor: Columns 6, 7, 8 and Rows 9..14 */}
        {[6, 7, 8].map((col) =>
          [9, 10, 11, 12, 13, 14].map((row) => {
            const isRedHomeColumn = col === 7 && row <= 13;
            const isRedStart = col === 6 && row === 13;
            const fillColor = isRedHomeColumn
              ? Colors.red
              : isRedStart
              ? Colors.redLight
              : '#FFFFFF';

            return (
              <Rect
                key={`cell-${col}-${row}`}
                x={col * cellSize}
                y={row * cellSize}
                width={cellSize}
                height={cellSize}
                fill={fillColor}
                stroke={Colors.gridLine}
                strokeWidth={1}
              />
            );
          })
        )}

        {/* Left Corridor: Rows 6, 7, 8 and Columns 0..5 */}
        {[0, 1, 2, 3, 4, 5].map((col) =>
          [6, 7, 8].map((row) => {
            const isGreenHomeColumn = row === 7 && col >= 1;
            const isGreenStart = row === 6 && col === 1;
            const fillColor = isGreenHomeColumn
              ? Colors.green
              : isGreenStart
              ? Colors.greenLight
              : '#FFFFFF';

            return (
              <Rect
                key={`cell-${col}-${row}`}
                x={col * cellSize}
                y={row * cellSize}
                width={cellSize}
                height={cellSize}
                fill={fillColor}
                stroke={Colors.gridLine}
                strokeWidth={1}
              />
            );
          })
        )}

        {/* Right Corridor: Rows 6, 7, 8 and Columns 9..14 */}
        {[9, 10, 11, 12, 13, 14].map((col) =>
          [6, 7, 8].map((row) => {
            const isBlueHomeColumn = row === 7 && col <= 13;
            const isBlueStart = row === 8 && col === 13;
            const fillColor = isBlueHomeColumn
              ? Colors.blue
              : isBlueStart
              ? Colors.blueLight
              : '#FFFFFF';

            return (
              <Rect
                key={`cell-${col}-${row}`}
                x={col * cellSize}
                y={row * cellSize}
                width={cellSize}
                height={cellSize}
                fill={fillColor}
                stroke={Colors.gridLine}
                strokeWidth={1}
              />
            );
          })
        )}

        {/* ============================================================== */}
        {/* 3. CENTER 4-SECTION FINISHING TRIANGLES (6..9, 6..9)           */}
        {/* ============================================================== */}
        <G>
          {/* Top: Yellow Triangle */}
          <Polygon
            points={`
              ${6 * cellSize},${6 * cellSize}
              ${9 * cellSize},${6 * cellSize}
              ${7.5 * cellSize},${7.5 * cellSize}
            `}
            fill={Colors.yellow}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          {/* Right: Blue Triangle */}
          <Polygon
            points={`
              ${9 * cellSize},${6 * cellSize}
              ${9 * cellSize},${9 * cellSize}
              ${7.5 * cellSize},${7.5 * cellSize}
            `}
            fill={Colors.blue}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          {/* Bottom: Red Triangle */}
          <Polygon
            points={`
              ${6 * cellSize},${9 * cellSize}
              ${9 * cellSize},${9 * cellSize}
              ${7.5 * cellSize},${7.5 * cellSize}
            `}
            fill={Colors.red}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          {/* Left: Green Triangle */}
          <Polygon
            points={`
              ${6 * cellSize},${6 * cellSize}
              ${6 * cellSize},${9 * cellSize}
              ${7.5 * cellSize},${7.5 * cellSize}
            `}
            fill={Colors.green}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          {/* Central Center Accent Circle */}
          <Circle
            cx={7.5 * cellSize}
            cy={7.5 * cellSize}
            r={cellSize * 0.45}
            fill="#FFFFFF"
            stroke={Colors.gridLine}
            strokeWidth={1}
          />
        </G>

        {/* ============================================================== */}
        {/* 4. SAFE STAR CELLS (Standard 8 positions on track)             */}
        {/* ============================================================== */}
        {renderStar(6, 13, 'safe-red-start')}
        {renderStar(8, 12, 'safe-red-flight')}
        {renderStar(1, 6, 'safe-green-start')}
        {renderStar(2, 8, 'safe-green-flight')}
        {renderStar(8, 1, 'safe-yellow-start')}
        {renderStar(6, 2, 'safe-yellow-flight')}
        {renderStar(13, 8, 'safe-blue-start')}
        {renderStar(12, 6, 'safe-blue-flight')}
      </Svg>

      {/* ================================================================ */}
      {/* 5. INTERACTIVE GLOSSY TOKENS (Precise unified coordinate system)  */}
      {/* ================================================================ */}
      {players.map((p) =>
        p.tokens.map((tok) => {
          const isLegal = p.color === activePlayerColor && legalTokenIds.includes(tok.id);
          const coords = calculateTokenCoords(p.color, tok, cellSize);

          return (
            <TouchableOpacity
              key={`${p.color}-${tok.id}`}
              disabled={!isLegal}
              onPress={() => onTokenPress(tok.id)}
              activeOpacity={0.8}
              style={[
                styles.tokenTouchable,
                {
                  left: coords.x - cellSize * 0.42,
                  top: coords.y - cellSize * 0.42,
                  width: cellSize * 0.84,
                  height: cellSize * 0.84,
                  borderRadius: cellSize * 0.42,
                  backgroundColor: Colors[tok.color],
                  borderColor: isLegal ? '#FFFFFF' : 'rgba(255,255,255,0.9)',
                  borderWidth: isLegal ? 3 : 2,
                  shadowColor: isLegal ? Colors[tok.color] : '#000000',
                  shadowOpacity: isLegal ? 0.7 : 0.25,
                  shadowRadius: isLegal ? 6 : 3,
                  elevation: isLegal ? 8 : 3,
                },
              ]}
            >
              {/* Glossy inner core circle */}
              <View
                style={[
                  styles.tokenInnerPill,
                  {
                    backgroundColor: isLegal ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
};

// Coordinate system mapping tokens precisely onto the 15x15 board
function calculateTokenCoords(
  color: PlayerColor,
  token: Token,
  cellSize: number
): { x: number; y: number } {
  // Base Home yard wells (4 symmetrical positions per quadrant)
  if (token.position === -1) {
    const wellMap: Record<PlayerColor, [number, number][]> = {
      green: [[1.8, 1.8], [3.8, 1.8], [1.8, 3.8], [3.8, 3.8]],
      yellow: [[10.8, 1.8], [12.8, 1.8], [10.8, 3.8], [12.8, 3.8]],
      red: [[1.8, 10.8], [3.8, 10.8], [1.8, 12.8], [3.8, 12.8]],
      blue: [[10.8, 10.8], [12.8, 10.8], [10.8, 12.8], [12.8, 12.8]],
    };
    const [wx, wy] = wellMap[color][token.id];
    return { x: wx * cellSize, y: wy * cellSize };
  }

  // Central finishing goal (999)
  if (token.position === 999) {
    const finishOffsets: Record<PlayerColor, [number, number]> = {
      red: [7.5, 8.0],
      green: [7.0, 7.5],
      yellow: [7.5, 7.0],
      blue: [8.0, 7.5],
    };
    const [fx, fy] = finishOffsets[color];
    return { x: fx * cellSize, y: fy * cellSize };
  }

  // Home stretch columns (100..105 -> steps 51..56)
  if (token.position >= 100) {
    const step = token.position - 100 + 1;
    let gx = 7, gy = 7;
    if (color === 'red') { gx = 7; gy = 14 - step; }
    else if (color === 'green') { gx = step; gy = 7; }
    else if (color === 'yellow') { gx = 7; gy = step; }
    else if (color === 'blue') { gx = 14 - step; gy = 7; }
    return { x: (gx + 0.5) * cellSize, y: (gy + 0.5) * cellSize };
  }

  // 52-tile main outer track
  const [gx, gy] = TRACK_GRID_COORDS[token.position] || [7, 7];
  return { x: (gx + 0.5) * cellSize, y: (gy + 0.5) * cellSize };
}

// 52 track grid positions [gridX, gridY] on 15x15 board
const TRACK_GRID_COORDS: [number, number][] = [
  // 0..4 (Red starting column heading North towards center)
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  // 5..10 (Turn West towards Green base)
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  // 11..12 (End of West corridor, turnaround North)
  [0, 7], [0, 6],
  // 13..17 (Green start heading East)
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  // 18..23 (Turn North towards Yellow base)
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  // 24..25 (End of North corridor, turnaround East)
  [7, 0], [8, 0],
  // 26..30 (Yellow start heading South)
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  // 31..36 (Turn East towards Blue base)
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  // 37..38 (End of East corridor, turnaround South)
  [14, 7], [14, 8],
  // 39..43 (Blue start heading West)
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  // 44..49 (Turn South towards Red base)
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  // 50..51 (End of South corridor, turnaround West to reach start)
  [7, 14], [6, 14],
];

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tokenTouchable: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  tokenInnerPill: {
    width: '40%',
    height: '40%',
    borderRadius: 99,
  },
});
