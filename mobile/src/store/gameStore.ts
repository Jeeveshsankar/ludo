import { create } from 'zustand';
import { GameState, initializeGame, rollDice, applyMove, PlayerColor } from '../engine/LudoEngineTS';

const BACKEND_BASE = 'https://heysakhi-ludo.vercel.app';
const WS_BASE = 'wss://heysakhi-ludo.vercel.app/ws';

export interface RoomPlayer {
  user_id: string;
  username: string;
  color: PlayerColor;
  seat: number;
  tokens: any[];
  is_ready: boolean;
  is_online: boolean;
  finished: boolean;
}

export interface BackendRoom {
  code: string;
  host_id: string;
  capacity: number;
  status: 'lobby' | 'in_game' | 'finished';
  players: Record<string, RoomPlayer>;
  turn_order: string[];
  current_turn_index: number;
  dice_value: number | null;
  dice_rolled: boolean;
  legal_tokens: number[];
  winner_id: string;
  version: number;
}

interface AppStoreState {
  // Navigation & User
  user: { id: string; username: string } | null;
  token: string | null;
  currentScreen: 'Home' | 'OfflineSetup' | 'OnlineMode' | 'CreateRoom' | 'JoinRoom' | 'Matchmaking' | 'Lobby' | 'Game';
  
  // Game & Mode
  gameMode: 'offline' | 'online';
  gameState: GameState | null; // Used for local offline or current display
  selectedTokenId: number | null;
  isRolling: boolean;
  
  // Online Multiplayer State
  onlineRoom: BackendRoom | null;
  wsConnected: boolean;
  onlineError: string | null;
  isSearchingMatch: boolean;

  // Actions
  setScreen: (screen: AppStoreState['currentScreen']) => void;
  setUser: (user: { id: string; username: string }, token: string) => void;
  
  // Offline Gameplay
  startOfflineGame: (players: { name: string; color: PlayerColor }[]) => void;
  rollLocalDice: () => void;
  moveLocalToken: (tokenId: number) => void;
  resetLocalGame: () => void;

  // Online Gameplay & Lobby
  createOnlineRoom: (capacity: number, username: string) => Promise<boolean>;
  joinOnlineRoom: (code: string, username: string) => Promise<boolean>;
  joinQuickMatch: (capacity: number, username: string) => Promise<boolean>;
  cancelMatchmaking: () => void;
  toggleReady: () => void;
  startOnlineGame: () => void;
  leaveOnlineRoom: () => void;
  rollOnlineDice: () => void;
  moveOnlineToken: (tokenId: number) => void;
}

let activeSocket: WebSocket | null = null;

export const useAppStore = create<AppStoreState>((set, get) => ({
  user: null,
  token: null,
  currentScreen: 'Home',
  gameMode: 'offline',
  gameState: null,
  selectedTokenId: null,
  isRolling: false,
  onlineRoom: null,
  wsConnected: false,
  onlineError: null,
  isSearchingMatch: false,

  setScreen: (screen) => set({ currentScreen: screen, onlineError: null }),

  setUser: (user, token) => set({ user, token }),

  // OFFLINE GAME LOGIC
  startOfflineGame: (players) => {
    const game = initializeGame(players, 'offline');
    set({
      gameMode: 'offline',
      gameState: game,
      selectedTokenId: null,
      currentScreen: 'Game',
    });
  },

  rollLocalDice: () => {
    const { gameState, isRolling } = get();
    if (!gameState || isRolling || gameState.turnStatus !== 'awaiting_roll') return;

    set({ isRolling: true });
    setTimeout(() => {
      const next = rollDice(gameState);
      set({ gameState: next, isRolling: false });

      if (next.legalTokenIds.length === 0) {
        setTimeout(() => {
          const s = get().gameState;
          if (s && s.turnStatus === 'awaiting_move') {
            const nextTurn = (s.currentTurnIndex + 1) % s.players.length;
            set({
              gameState: {
                ...s,
                currentTurnIndex: nextTurn,
                diceValue: null,
                diceRolled: false,
                turnStatus: 'awaiting_roll',
              },
            });
          }
        }, 1200);
      }
    }, 500);
  },

  moveLocalToken: (tokenId: number) => {
    const { gameState } = get();
    if (!gameState || !gameState.diceRolled || !gameState.legalTokenIds.includes(tokenId)) return;

    const { nextState } = applyMove(gameState, tokenId);
    set({ gameState: nextState, selectedTokenId: null });
  },

  resetLocalGame: () => {
    set({ gameState: null, selectedTokenId: null, isRolling: false });
  },

  // ONLINE MULTIPLAYER ACTIONS
  createOnlineRoom: async (capacity, username) => {
    set({ onlineError: null });
    try {
      const res = await fetch(`${BACKEND_BASE}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capacity, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');

      set({
        onlineRoom: data.room,
        user: data.user,
        token: data.token,
        gameMode: 'online',
        currentScreen: 'Lobby',
      });

      connectWebSocket(data.room.code, data.token);
      return true;
    } catch (err: any) {
      set({ onlineError: err.message || 'Network error' });
      return false;
    }
  },

  joinOnlineRoom: async (code, username) => {
    set({ onlineError: null });
    try {
      const res = await fetch(`${BACKEND_BASE}/api/rooms/${code.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join room');

      set({
        onlineRoom: data.room,
        user: data.user,
        token: data.token,
        gameMode: 'online',
        currentScreen: 'Lobby',
      });

      connectWebSocket(data.room.code, data.token);
      return true;
    } catch (err: any) {
      set({ onlineError: err.message || 'Network error' });
      return false;
    }
  },

  joinQuickMatch: async (capacity, username) => {
    set({ isSearchingMatch: true, onlineError: null });
    try {
      const res = await fetch(`${BACKEND_BASE}/api/matchmaking/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capacity, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Matchmaking failed');

      set({
        onlineRoom: data.room,
        user: data.user,
        token: data.token,
        gameMode: 'online',
        isSearchingMatch: false,
        currentScreen: data.room.status === 'in_game' ? 'Game' : 'Lobby',
      });

      connectWebSocket(data.room.code, data.token);
      return true;
    } catch (err: any) {
      set({ isSearchingMatch: false, onlineError: err.message || 'Matchmaking error' });
      return false;
    }
  },

  cancelMatchmaking: () => {
    set({ isSearchingMatch: false, currentScreen: 'OnlineMode' });
  },

  toggleReady: () => {
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(JSON.stringify({ event: 'room.ready', payload: {} }));
    }
  },

  startOnlineGame: () => {
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(JSON.stringify({ event: 'game.start', payload: {} }));
    }
  },

  leaveOnlineRoom: () => {
    if (activeSocket) {
      activeSocket.close();
      activeSocket = null;
    }
    set({ onlineRoom: null, wsConnected: false, currentScreen: 'OnlineMode' });
  },

  rollOnlineDice: () => {
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(JSON.stringify({ event: 'game.roll_dice', payload: {} }));
    }
  },

  moveOnlineToken: (tokenId) => {
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(JSON.stringify({ event: 'game.move_token', payload: { token_id: tokenId } }));
    }
  },
}));

function connectWebSocket(roomCode: string, token: string) {
  if (activeSocket) {
    activeSocket.close();
  }

  const wsUrl = `${WS_BASE}?room=${roomCode}&token=${token}`;
  activeSocket = new WebSocket(wsUrl);

  activeSocket.onopen = () => {
    useAppStore.setState({ wsConnected: true });
  };

  activeSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const { event: evName, payload } = data;

      if (evName === 'room.updated' || evName === 'room.player_joined' || evName === 'room.player_left') {
        useAppStore.setState({ onlineRoom: payload });
      } else if (evName === 'game.started') {
        useAppStore.setState({ onlineRoom: payload, currentScreen: 'Game' });
      } else if (evName === 'game.dice_result') {
        useAppStore.setState({ onlineRoom: payload.room });
      } else if (evName === 'game.token_moved' || evName === 'game.turn_changed') {
        useAppStore.setState({ onlineRoom: payload.room || payload });
      } else if (evName === 'game.player_won') {
        useAppStore.setState({ onlineRoom: payload.room });
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  };

  activeSocket.onclose = () => {
    useAppStore.setState({ wsConnected: false });
  };
}

export const useGameStore = useAppStore;
