/**
 * HeySakhi Ludo Game Engine Specification & Core Types
 * Deterministic Game State Model
 */

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Token {
  id: number; // 0, 1, 2, 3
  color: PlayerColor;
  /**
   * position:
   *  -1: Base / Yard
   *  0..51: Shared Outer Track
   *  100..105: Home Column (100 = 1st tile into column, 105 = 6th tile into column)
   *  999: Reached Goal / Home Triangle
   */
  position: number;
  /**
   * steps: Total distance traveled from starting square.
   * 0 = Just entered starting tile
   * 50 = Reached turn into player's home column
   * 51..55 = Traveling inside home column
   * 56 = Finished / Reached Center
   */
  steps: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  seat: number; // 0, 1, 2, 3
  isAuto?: boolean;
  tokens: Token[];
  hasWon?: boolean;
  rank?: number;
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

// Track Length and Coordinates constants
export const BOARD_TRACK_LENGTH = 52;
export const MAX_STEPS_TO_FINISH = 56;

// Safe tiles on the 0..51 track: Starting tiles + Star tiles
export const SAFE_TILES: ReadonlySet<number> = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Starting tile index for each color on track (0..51)
export const COLOR_START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const COLOR_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

/**
 * Creates an initial fresh token set
 */
export function createTokens(color: PlayerColor): Token[] {
  return [0, 1, 2, 3].map((id) => ({
    id,
    color,
    position: -1,
    steps: -1,
  }));
}

/**
 * Calculates which tokens are legally movable with the given dice roll.
 */
export function getLegalMoves(player: Player, dice: number): number[] {
  const legal: number[] = [];
  for (const token of player.tokens) {
    if (token.position === 999) {
      continue; // Finished token cannot move
    }

    if (token.position === -1) {
      // Must roll a 6 to exit base
      if (dice === 6) {
        legal.push(token.id);
      }
      continue;
    }

    // Check if token can advance without overshooting the finish (step 56)
    if (token.steps + dice <= MAX_STEPS_TO_FINISH) {
      legal.push(token.id);
    }
  }
  return legal;
}

/**
 * Executes a move for the given token and dice value.
 * Handles:
 *  - Exiting base
 *  - Moving along track
 *  - Turning into home column
 *  - Reaching exact finish
 *  - Capturing opponent tokens
 */
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
    throw new Error(`Token ${tokenId} not found for player ${player.name}`);
  }

  // Clone state immutably
  const nextPlayers = state.players.map((p, pIdx) => {
    if (pIdx !== state.currentTurnIndex) return { ...p, tokens: p.tokens.map((t) => ({ ...t })) };
    return {
      ...p,
      tokens: p.tokens.map((t) => ({ ...t })),
    };
  });

  const activePlayer = nextPlayers[state.currentTurnIndex];
  const token = activePlayer.tokens[tokenIndex];

  let reachedHome = false;
  let won = false;
  let capturedToken: { player: Player; token: Token } | null = null;

  if (token.position === -1) {
    // Exiting base onto starting tile
    token.position = COLOR_START_INDEX[token.color];
    token.steps = 0;
  } else {
    // Advancing steps
    token.steps += dice;

    if (token.steps === MAX_STEPS_TO_FINISH) {
      // Reached Goal!
      token.position = 999;
      reachedHome = true;

      // Check if all tokens have reached home
      const allFinished = activePlayer.tokens.every((t) => t.position === 999);
      if (allFinished) {
        activePlayer.hasWon = true;
        won = true;
      }
    } else if (token.steps > 50) {
      // In Home Column: 100 to 105
      token.position = 100 + (token.steps - 51);
    } else {
      // Normal Track Movement
      const startIdx = COLOR_START_INDEX[token.color];
      token.position = (startIdx + token.steps) % BOARD_TRACK_LENGTH;

      // Check capture on opponent tokens if not on a safe tile
      if (!SAFE_TILES.has(token.position)) {
        for (let i = 0; i < nextPlayers.length; i++) {
          if (i === state.currentTurnIndex) continue;
          const otherPlayer = nextPlayers[i];
          for (const otherToken of otherPlayer.tokens) {
            if (otherToken.position === token.position) {
              // Capture! Send other token back to base
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

  // Determine if active player gets an extra turn:
  // Rolling a 6 grants another turn, OR capturing an opponent grants another turn.
  // Exception: winning the game ends turns.
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

/**
 * Handles rolling the dice for the current player
 */
export function rollDice(state: GameState, deterministicValue?: number): GameState {
  if (state.turnStatus === 'finished') return state;

  const diceVal = deterministicValue ?? Math.floor(Math.random() * 6) + 1;
  const currentConsecutiveSixes = diceVal === 6 ? state.consecutiveSixes + 1 : 0;

  // Rule: 3 consecutive sixes voids the turn!
  if (currentConsecutiveSixes === 3) {
    return {
      ...state,
      diceValue: 6,
      diceRolled: false,
      consecutiveSixes: 0,
      legalTokenIds: [],
      currentTurnIndex: (state.currentTurnIndex + 1) % state.players.length,
      turnStatus: 'awaiting_roll',
      lastMoveNotice: `${state.players[state.currentTurnIndex].name} rolled three 6s in a row! Turn forfeited.`,
      version: state.version + 1,
    };
  }

  const currentPlayer = state.players[state.currentTurnIndex];
  const legal = getLegalMoves(currentPlayer, diceVal);

  if (legal.length === 0) {
    // No moves possible: advance to next player after showing roll
    return {
      ...state,
      diceValue: diceVal,
      diceRolled: true,
      consecutiveSixes: currentConsecutiveSixes,
      legalTokenIds: [],
      turnStatus: 'awaiting_move',
      lastMoveNotice: `${currentPlayer.name} rolled a ${diceVal} but has no legal moves.`,
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
    lastMoveNotice: `${currentPlayer.name} rolled a ${diceVal}! Select a token to move.`,
    version: state.version + 1,
  };
}

/**
 * Initializes a new game state with the given players and mode
 */
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

