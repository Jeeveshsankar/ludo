# HeySakhi Ludo — Complete Mobile Game

> Modern, Colorful, Futuristic Multiplayer Ludo Gaming Application. Built with React Native & Expo for Mobile, and a Real-Time Authoritative Game Engine.

---

## 🌟 Highlights & Supported Modes

### Mode 1: Offline Multiplayer (Pass & Play)
- Fully functional on a single physical mobile device.
- Works 100% offline without internet connection or login.
- Supports **2, 3, and 4 players**.
- Full deterministic Ludo game mechanics:
  - Base exit with 6
  - Consecutive 3-sixes penalty rule
  - Exact home finish (56 steps)
  - Star tiles & Base start tile safe spots
  - Opponent token capture with yard return
  - Extra turn rewards on 6 or capture

### Mode 2: Online Real-Time Multiplayer
- Authoritative server state.
- Private room creation with unique 6-character room codes.
- Join room with code & native mobile sharing.
- WebSocket live game state synchronization.
- Monotonically increasing room versioning & idempotency.

---

## 🏗️ Architecture & Folder Structure

```
HEYSAKHI LUDO/
│
├── mobile/                        # React Native / Expo Mobile Application
│   ├── App.tsx                    # Main App Root & Screen Navigator
│   ├── src/
│   │   ├── components/
│   │   │   ├── LudoBoard.tsx      # SVG Ludo Board & Interactive Animated Tokens
│   │   │   └── Dice.tsx           # 3D Animated Rolling Dice
│   │   ├── engine/
│   │   │   ├── LudoEngineTS.ts    # Deterministic TypeScript Game Engine
│   │   │   ├── LudoEngine.js      # Shared CommonJS Engine Module
│   │   │   └── test-engine.js     # 36 Automated Game Engine Tests
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx     # Mode selection & Career Profile HUD
│   │   │   ├── GameScreen.tsx     # Fullscreen Gameplay & HUD
│   │   │   └── OnlineLobbyScreen.tsx # Room creation, Code generation, Join
│   │   ├── store/
│   │   │   └── gameStore.ts       # Zustand Global State
│   │   └── theme/
│   │       └── index.ts           # HeySakhi Design System (Colors, Typography)
│   └── package.json
│
├── backend/                       # Authoritative Backend
│   ├── cmd/
│   │   └── main.go                # Golang Backend (Gin, Gorilla WS, JWT)
│   ├── server.js                  # Node.js WebSocket & REST Server
│   ├── migrations/
│   │   └── init.sql               # PostgreSQL Schema Migrations
│   ├── Dockerfile
│   └── go.mod
│
├── docs/                          # Technical Documentation
│   ├── api.md                     # REST API Reference
│   └── websocket-events.md        # WebSocket Event Protocol Reference
│
├── docker-compose.yml             # Full Infrastructure (Engine + Postgres + Redis)
└── README.md
```

---

## 🚀 Quickstart & Development

### 1. Run Automated Engine Verification Tests
Verify all 36 test scenarios (captures, safe tiles, base exit, extra turns, 3 consecutive sixes penalty, exact finish, turn progression):
```bash
cd mobile
npm test
```

### 2. Start the Backend Server
```bash
# Option A: Node.js server (REST + WebSockets)
node backend/server.js

# Option B: Docker Compose (Backend + PostgreSQL + Redis)
docker compose up -d
```

### 3. Start the Mobile Application
```bash
cd mobile
npx expo start
```
- Press `a` for Android Emulator
- Press `i` for iOS Simulator
- Scan the QR code with Expo Go on your physical mobile device.

