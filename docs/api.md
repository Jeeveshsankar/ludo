# API Reference: HeySakhi Ludo

## 1. Health & Readiness

### `GET /health`
Returns current server status.
```json
{
  "status": "ok",
  "service": "heysakhi-ludo-engine",
  "time": "2026-11-02T07:05:00.000Z"
}
```

---

## 2. Authentication

### `POST /api/auth/register`
**Body:**
```json
{
  "username": "SakhiPlayer",
  "email": "player@domain.com",
  "password": "StrongPassword123!"
}
```
**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "usr_1730000000",
    "username": "SakhiPlayer",
    "email": "player@domain.com",
    "avatar": "avatar_1"
  }
}
```

### `POST /api/auth/login`
**Body:**
```json
{
  "email": "player@domain.com",
  "password": "StrongPassword123!"
}
```

---

## 3. User & Statistics

### `GET /api/users/me`
*Headers: `Authorization: Bearer <token>`*

### `GET /api/users/me/stats`
*Headers: `Authorization: Bearer <token>`*
```json
{
  "user_id": "usr_demo_1",
  "games_played": 12,
  "games_won": 9,
  "games_lost": 3,
  "total_captures": 24,
  "win_percentage": 75.0
}
```

---

## 4. Room Management

### `POST /api/rooms`
Create a new private room.
**Body:**
```json
{
  "capacity": 4
}
```
**Response (201 Created):**
```json
{
  "code": "A8X2K9",
  "host_id": "usr_demo_1",
  "capacity": 4,
  "status": "lobby",
  "players": { ... }
}
```

### `POST /api/rooms/:code/join`
Join an existing room using code.

