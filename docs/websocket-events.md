# WebSocket Event Protocol: HeySakhi Ludo

Connection endpoint:
`ws://<host>:8080/ws?token=<JWT_TOKEN>&room=<ROOM_CODE>`

All messages conform to the envelope:
```json
{
  "event": "event.name",
  "payload": {},
  "time": 1730000000000
}
```

## Client -> Server Events

### 1. `room.ready`
Toggles player readiness inside the lobby.

### 2. `game.start`
Host triggers game start when player count >= 2 and players are ready.

### 3. `game.roll_dice`
Current turn player requests server to roll the dice.
The server generates cryptographic random (1..6) and returns `game.dice_result`.

### 4. `game.move_token`
Player submits chosen token to move:
```json
{
  "token_id": 0
}
```

---

## Server -> Client Events

### 1. `room.player_joined`
Broadcasted when a new player enters the lobby.

### 2. `game.started`
Broadcasted when game transitions to `in_game`.

### 3. `game.dice_result`
Broadcasts the authoritative dice value and legal tokens:
```json
{
  "dice": 6,
  "legal_tokens": [0, 1, 2, 3],
  "player_id": "usr_demo_1"
}
```

### 4. `game.token_moved`
Broadcasts token movement, captures, and home reach:
```json
{
  "token_id": 0,
  "player_id": "usr_demo_1",
  "captured": true,
  "captured_player_id": "usr_2",
  "finished": false
}
```

### 5. `game.turn_changed`
Notifies clients of whose turn it is next.

### 6. `game.player_won`
Declares the winner when all 4 tokens have reached finish.

