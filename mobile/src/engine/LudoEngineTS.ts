/**
 * HeySakhi Ludo Game Engine Typescript Definitions
 */

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Token {
  id: number;
  color: PlayerColor;
  position: number;
  steps: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  seat: number;
  tokens: Token[];
  hasWon?: boolean;
}

export interface GameState {
  id: string;
  mode: 'offline' | 'online';
  playerCount: 2 | 3 | 4;
  players: Player[];
  currentTurnIndex: number;
  diceValue: number | null;
  diceRolled: boolean;
  consecutiveSixes: number;
  legalTokenIds: number[];
  winner: Player | null;
  turnStatus: 'awaiting_roll' | 'awaiting_move' | 'finished';
  lastMoveNotice?: string;
  version: number;
}

export const BOARD_TRACK_LENGTH = 52;
export const MAX_STEPS_TO_FINISH = 56;
export const SAFE_TILES: ReadonlySet<number> = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export const COLOR_START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const COLOR_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export function createTokens(color: PlayerColor): Token[] {
  return [0, 1, 2, 3].map((id) => ({
    id,
    color,
    position: -1,
    steps: -1,
  }));
}

export function getLegalMoves(player: Player, dice: number): number[] {
  const legal: number[] = [];
  for (const token of player.tokens) {
    if (token.position === 999) continue;
    if (token.position === -1) {
      if (dice === 6) legal.push(token.id);
      continue;
    }
    if (token.steps + dice <= MAX_STEPS_TO_FINISH) {
      legal.push(token.id);
    }
  }
  return legal;
}

export function applyMove(
  state: GameState,
  tokenId: number
): {
  nextState: GameState;
  capturedToken: { player: Player; token: Token } | null;
  reachedHome: boolean;
  won: boolean;
  extraTurn: boolean;
} {
  if (!state.diceRolled || state.diceValue === null) {
    throw new Error('Cannot move token: dice has not been rolled');
  }

  const dice = state.diceValue;
  const player = state.players[state.currentTurnIndex];
  const tokenIndex = player.tokens.findIndex((t) => t.id === tokenId);
  if (tokenIndex === -1) {
    throw new Error(`Token ${tokenId} not found`);
  }

  const nextPlayers = state.players.map((p, pIdx) => {
    if (pIdx !== state.currentTurnIndex) return { ...p, tokens: p.tokens.map((t) => ({ ...t })) };
    return { ...p, tokens: p.tokens.map((t) => ({ ...t })) };
  });

  const activePlayer = nextPlayers[state.currentTurnIndex];
  const token = activePlayer.tokens[tokenIndex];

  let reachedHome = false;
  let won = false;
  let capturedToken: { player: Player; token: Token } | null = null;

  if (token.position === -1) {
    token.position = COLOR_START_INDEX[token.color];
    token.steps = 0;
  } else {
    token.steps += dice;

    if (token.steps === MAX_STEPS_TO_FINISH) {
      token.position = 999;
      reachedHome = true;
      const allFinished = activePlayer.tokens.every((t) => t.position === 999);
      if (allFinished) {
        activePlayer.hasWon = true;
        won = true;
      }
    } else if (token.steps > 50) {
      token.position = 100 + (token.steps - 51);
    } else {
      const startIdx = COLOR_START_INDEX[token.color];
      token.position = (startIdx + token.steps) % BOARD_TRACK_LENGTH;

      if (!SAFE_TILES.has(token.position)) {
        for (let i = 0; i < nextPlayers.length; i++) {
          if (i === state.currentTurnIndex) continue;
          const otherPlayer = nextPlayers[i];
          for (const otherToken of otherPlayer.tokens) {
            if (otherToken.position === token.position) {
              otherToken.position = -1;
              otherToken.steps = -1;
              capturedToken = { player: otherPlayer, token: otherToken };
              break;
            }
          }
          if (capturedToken) break;
        }
      }
    }
  }

  const extraTurn = (dice === 6 || capturedToken !== null) && !won;
  const nextTurnIndex = extraTurn
    ? state.currentTurnIndex
    : (state.currentTurnIndex + 1) % state.players.length;

  const nextState: GameState = {
    ...state,
    players: nextPlayers,
    currentTurnIndex: nextTurnIndex,
    diceValue: null,
    diceRolled: false,
    legalTokenIds: [],
    consecutiveSixes: dice === 6 ? state.consecutiveSixes : 0,
    turnStatus: won ? 'finished' : 'awaiting_roll',
    winner: won ? activePlayer : null,
    lastMoveNotice: capturedToken
      ? `${activePlayer.name} captured ${capturedToken.player.name}'s token!`
      : reachedHome
      ? `${activePlayer.name} brought a token HOME!`
      : undefined,
    version: state.version + 1,
  };

  return {
    nextState,
    capturedToken,
    reachedHome,
    won,
    extraTurn,
  };
}

export function rollDice(state: GameState, deterministicValue?: number): GameState {
  if (state.turnStatus === 'finished') return state;

  const diceVal = deterministicValue ?? Math.floor(Math.random() * 6) + 1;
  const currentConsecutiveSixes = diceVal === 6 ? state.consecutiveSixes + 1 : 0;

  if (currentConsecutiveSixes === 3) {
    return {
      ...state,
      diceValue: 6,
      diceRolled: false,
      consecutiveSixes: 0,
      legalTokenIds: [],
      currentTurnIndex: (state.currentTurnIndex + 1) % state.players.length,
      turnStatus: 'awaiting_roll',
      lastMoveNotice: `${state.players[state.currentTurnIndex].name} rolled three 6s! Turn forfeited.`,
      version: state.version + 1,
    };
  }

  const currentPlayer = state.players[state.currentTurnIndex];
  const legal = getLegalMoves(currentPlayer, diceVal);

  if (legal.length === 0) {
    return {
      ...state,
      diceValue: diceVal,
      diceRolled: true,
      consecutiveSixes: currentConsecutiveSixes,
      legalTokenIds: [],
      turnStatus: 'awaiting_move',
      lastMoveNotice: `${currentPlayer.name} rolled a ${diceVal} but has no moves.`,
      version: state.version + 1,
    };
  }

  return {
    ...state,
    diceValue: diceVal,
    diceRolled: true,
    consecutiveSixes: currentConsecutiveSixes,
    legalTokenIds: legal,
    turnStatus: 'awaiting_move',
    lastMoveNotice: `${currentPlayer.name} rolled a ${diceVal}! Select a token.`,
    version: state.version + 1,
  };
}

export function initializeGame(
  playerConfigs: { name: string; color: PlayerColor; avatar?: string }[],
  mode: 'offline' | 'online' = 'offline'
): GameState {
  const players: Player[] = playerConfigs.map((cfg, idx) => ({
    id: `p_${idx + 1}`,
    name: cfg.name,
    avatar: cfg.avatar || `avatar_${idx + 1}`,
    color: cfg.color,
    seat: idx,
    tokens: createTokens(cfg.color),
    hasWon: false,
  }));

  return {
    id: `game_${Date.now()}`,
    mode,
    playerCount: players.length as 2 | 3 | 4,
    players,
    currentTurnIndex: 0,
    diceValue: null,
    diceRolled: false,
    consecutiveSixes: 0,
    legalTokenIds: [],
    winner: null,
    turnStatus: 'awaiting_roll',
    version: 1,
  };
}

