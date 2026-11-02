const http = require('http');
const crypto = require('crypto');

const PORT = 8082;
const JWT_SECRET = 'heysakhi_ludo_super_secret_jwt_key_2025';

// --- GAME LOGIC CONSTANTS ---
const BOARD_TRACK_LENGTH = 52;
const SAFE_TILES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const COLOR_START_INDEX = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// In-memory data store
const usersByEmail = new Map();
const usersById = new Map();
const statsById = new Map();
const roomsByCode = new Map();
const matchHistory = [];
const matchmakingQueues = {
  2: [],
  3: [],
  4: [],
};

// Seed demo user
const demoUser = {
  id: 'usr_demo_1',
  username: 'SakhiMaster',
  email: 'player@heysakhi.com',
  password: 'Password123!',
  avatar: 'avatar_1',
  created_at: new Date().toISOString(),
};
usersByEmail.set(demoUser.email, demoUser);
usersById.set(demoUser.id, demoUser);
statsById.set(demoUser.id, {
  user_id: demoUser.id,
  games_played: 12,
  games_won: 9,
  games_lost: 3,
  total_captures: 24,
  win_percentage: 75.0,
});

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 72 * 3600 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const [header, body, sig] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.exp < Date.now()) return null;
    return data;
  } catch (err) {
    return null;
  }
}

function getOrCreateUser(authHeader, usernameFallback = 'Guest Player') {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const verified = verifyToken(token);
    if (verified && usersById.has(verified.sub)) {
      return usersById.get(verified.sub);
    }
  }
  // Auto-generate guest session user so anyone can immediately play online
  const guestId = `usr_guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const guestUser = {
    id: guestId,
    username: usernameFallback.startsWith('Guest') ? `Player_${guestId.slice(-4)}` : usernameFallback,
    email: `${guestId}@heysakhi.local`,
    avatar: 'avatar_1',
    created_at: new Date().toISOString(),
  };
  usersById.set(guestId, guestUser);
  statsById.set(guestId, {
    user_id: guestId,
    games_played: 0,
    games_won: 0,
    games_lost: 0,
    total_captures: 0,
    win_percentage: 0,
  });
  return guestUser;
}

function calculateLegalMoves(player, dice) {
  const legal = [];
  for (const tok of player.tokens) {
    if (tok.position === 999) continue;
    if (tok.position === -1) {
      if (dice === 6) legal.push(tok.id);
      continue;
    }
    if (tok.steps + dice <= 56) {
      legal.push(tok.id);
    }
  }
  return legal;
}

function executeMove(room, player, tokenId, dice) {
  const tok = player.tokens.find(t => t.id === tokenId);
  if (!tok) return { captured: false, capturedPlayerId: '', finished: false };

  if (tok.position === -1) {
    tok.position = COLOR_START_INDEX[player.color];
    tok.steps = 0;
    return { captured: false, capturedPlayerId: '', finished: false };
  }

  tok.steps += dice;
  if (tok.steps === 56) {
    tok.position = 999;
    const allDone = player.tokens.every(t => t.position === 999);
    if (allDone) player.finished = true;
    return { captured: false, capturedPlayerId: '', finished: true };
  }

  if (tok.steps > 50) {
    tok.position = 100 + (tok.steps - 51);
    return { captured: false, capturedPlayerId: '', finished: false };
  }

  const startTrack = COLOR_START_INDEX[player.color];
  tok.position = (startTrack + tok.steps) % BOARD_TRACK_LENGTH;

  let captured = false;
  let capturedPlayerId = '';
  if (!SAFE_TILES.has(tok.position)) {
    for (const [otherUid, otherPl] of Object.entries(room.players)) {
      if (otherUid === player.user_id) continue;
      for (const otherTok of otherPl.tokens) {
        if (otherTok.position === tok.position) {
          otherTok.position = -1;
          otherTok.steps = 0;
          captured = true;
          capturedPlayerId = otherUid;
          const s = statsById.get(player.user_id);
          if (s) s.total_captures++;
          break;
        }
      }
    }
  }

  return { captured, capturedPlayerId, finished: false };
}

// WebSocket Hub
const wsClients = new Set();

function broadcastToRoom(roomCode, event, payload) {
  const msg = JSON.stringify({
    event,
    payload,
    time: Date.now(),
  });
  for (const client of wsClients) {
    if (client.roomCode === roomCode && client.socket && !client.socket.destroyed) {
      sendWsFrame(client.socket, msg);
    }
  }
}

function sendWsFrame(socket, text) {
  const payload = Buffer.from(text);
  const length = payload.length;
  let header;

  if (length <= 125) {
    header = Buffer.from([0x81, length]);
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

// HTTP Request Handler
function handleHttpRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let jsonBody = {};
    if (body) {
      try { jsonBody = JSON.parse(body); } catch (e) {}
    }

    // Health
    if (pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'heysakhi-ludo-engine', time: new Date() }));
      return;
    }
    if (pathname === '/ready' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ready: true }));
      return;
    }

    // Auth
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { username, email, password } = jsonBody;
      if (!username || !email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'All fields required' }));
        return;
      }
      if (usersByEmail.has(email)) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email already registered' }));
        return;
      }
      const newUser = {
        id: `usr_${Date.now()}`,
        username,
        email,
        password,
        avatar: 'avatar_1',
        created_at: new Date().toISOString(),
      };
      usersByEmail.set(email, newUser);
      usersById.set(newUser.id, newUser);
      statsById.set(newUser.id, {
        user_id: newUser.id,
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        total_captures: 0,
        win_percentage: 0,
      });

      const token = createToken({ sub: newUser.id, username: newUser.username, email: newUser.email });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, user: newUser }));
      return;
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = jsonBody;
      const user = usersByEmail.get(email);
      if (!user || user.password !== password) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password' }));
        return;
      }
      const token = createToken({ sub: user.id, username: user.username, email: user.email });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, user }));
      return;
    }

    // User Profile
    if (pathname === '/api/users/me' && req.method === 'GET') {
      const user = getOrCreateUser(req.headers['authorization']);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(user));
      return;
    }

    // User Stats
    if (pathname === '/api/users/me/stats' && req.method === 'GET') {
      const user = getOrCreateUser(req.headers['authorization']);
      const stats = statsById.get(user.id) || { user_id: user.id, games_played: 0, games_won: 0, games_lost: 0, total_captures: 0, win_percentage: 0 };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
      return;
    }

    // Match History
    if (pathname === '/api/users/me/history' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(matchHistory));
      return;
    }

    // CREATE ROOM
    if (pathname === '/api/rooms' && req.method === 'POST') {
      const user = getOrCreateUser(req.headers['authorization'], jsonBody.username || 'Host');
      const capacity = Math.min(Math.max(parseInt(jsonBody.capacity) || 4, 2), 4);
      const code = 'SAKHI' + crypto.randomBytes(2).toString('hex').toUpperCase();

      const colors = capacity === 2 ? ['red', 'yellow'] : (capacity === 3 ? ['red', 'green', 'yellow'] : ['red', 'green', 'yellow', 'blue']);
      const hostColor = colors[0];

      const room = {
        code,
        host_id: user.id,
        capacity,
        status: 'lobby',
        players: {
          [user.id]: {
            user_id: user.id,
            username: user.username,
            color: hostColor,
            seat: 0,
            tokens: [0, 1, 2, 3].map(id => ({ id, position: -1, color: hostColor, steps: -1 })),
            is_ready: true,
            is_online: true,
            finished: false,
          }
        },
        turn_order: [user.id],
        current_turn_index: 0,
        dice_value: null,
        dice_rolled: false,
        consecutive_sixes: 0,
        legal_tokens: [],
        winner_id: '',
        version: 1,
        created_at: new Date().toISOString(),
      };

      roomsByCode.set(code, room);
      const token = createToken({ sub: user.id, username: user.username, email: user.email });

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ room, token, user }));
      return;
    }

    // GET ROOM
    if (pathname.startsWith('/api/rooms/') && req.method === 'GET') {
      const code = pathname.split('/')[3]?.toUpperCase();
      const room = roomsByCode.get(code);
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Room not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(room));
      return;
    }

    // JOIN ROOM
    if (pathname.match(/^\/api\/rooms\/[^\/]+\/join$/) && req.method === 'POST') {
      const code = pathname.split('/')[3]?.toUpperCase();
      const room = roomsByCode.get(code);
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Room does not exist' }));
        return;
      }

      const user = getOrCreateUser(req.headers['authorization'], jsonBody.username || 'Player');
      const uid = user.id;

      if (!room.players[uid]) {
        const currentCount = Object.keys(room.players).length;
        if (currentCount >= room.capacity) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Room is full' }));
          return;
        }
        if (room.status !== 'lobby') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Game is already in progress' }));
          return;
        }

        const colors = room.capacity === 2 ? ['red', 'yellow'] : (room.capacity === 3 ? ['red', 'green', 'yellow'] : ['red', 'green', 'yellow', 'blue']);
        const usedColors = new Set(Object.values(room.players).map(p => p.color));
        const color = colors.find(c => !usedColors.has(c)) || 'blue';

        room.players[uid] = {
          user_id: uid,
          username: user.username,
          color,
          seat: currentCount,
          tokens: [0, 1, 2, 3].map(id => ({ id, position: -1, color, steps: -1 })),
          is_ready: false,
          is_online: true,
          finished: false,
        };
        room.turn_order.push(uid);
        room.version++;
      }

      broadcastToRoom(code, 'room.player_joined', room);
      const token = createToken({ sub: user.id, username: user.username, email: user.email });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ room, token, user }));
      return;
    }

    // LEAVE ROOM
    if (pathname.match(/^\/api\/rooms\/[^\/]+\/leave$/) && req.method === 'POST') {
      const code = pathname.split('/')[3]?.toUpperCase();
      const room = roomsByCode.get(code);
      if (room) {
        const user = getOrCreateUser(req.headers['authorization']);
        delete room.players[user.id];
        room.turn_order = room.turn_order.filter(id => id !== user.id);
        room.version++;
        broadcastToRoom(code, 'room.player_left', { user_id: user.id, room });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // TOGGLE READY
    if (pathname.match(/^\/api\/rooms\/[^\/]+\/ready$/) && req.method === 'POST') {
      const code = pathname.split('/')[3]?.toUpperCase();
      const room = roomsByCode.get(code);
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Room not found' }));
        return;
      }
      const user = getOrCreateUser(req.headers['authorization']);
      const p = room.players[user.id];
      if (p) {
        p.is_ready = !p.is_ready;
        room.version++;
        broadcastToRoom(code, 'room.updated', room);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(room));
      return;
    }

    // START GAME (HTTP Fallback)
    if (pathname.match(/^\/api\/rooms\/[^\/]+\/start$/) && req.method === 'POST') {
      const code = pathname.split('/')[3]?.toUpperCase();
      const room = roomsByCode.get(code);
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Room not found' }));
        return;
      }
      const user = getOrCreateUser(req.headers['authorization']);
      if (room.host_id === user.id && Object.keys(room.players).length >= 2) {
        room.status = 'in_game';
        room.current_turn_index = 0;
        room.dice_value = null;
        room.dice_rolled = false;
        room.version++;
        broadcastToRoom(code, 'game.started', room);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(room));
      return;
    }

    // ROLL DICE (HTTP Fallback)
    if (pathname.match(/^\/api\/rooms\/[^\/]+\/roll$/) && req.method === 'POST') {
      const code = pathname.split('/')[3]?.toUpperCase();
      const room = roomsByCode.get(code);
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Room not found' }));
        return;
      }
      const user = getOrCreateUser(req.headers['authorization']);
      const currentUid = room.turn_order[room.current_turn_index];
      if (currentUid === user.id && !room.dice_rolled && room.status === 'in_game') {
        const val = crypto.randomInt(1, 7);
        room.dice_value = val;
        room.dice_rolled = true;
        if (val === 6) room.consecutive_sixes++;
        else room.consecutive_sixes = 0;

        if (room.consecutive_sixes === 3) {
          room.consecutive_sixes = 0;
          room.dice_rolled = false;
          room.legal_tokens = [];
          room.current_turn_index = (room.current_turn_index + 1) % room.turn_order.length;
          room.version++;
        } else {
          const p = room.players[user.id];
          const legal = calculateLegalMoves(p, val);
          room.legal_tokens = legal;
          room.version++;
          if (legal.length === 0) {
            setTimeout(() => {
              room.dice_rolled = false;
              room.legal_tokens = [];
              room.current_turn_index = (room.current_turn_index + 1) % room.turn_order.length;
              room.version++;
            }, 1200);
          }
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(room));
      return;
    }

    // MOVE TOKEN (HTTP Fallback)
    if (pathname.match(/^\/api\/rooms\/[^\/]+\/move$/) && req.method === 'POST') {
      const code = pathname.split('/')[3]?.toUpperCase();
      const room = roomsByCode.get(code);
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Room not found' }));
        return;
      }
      const user = getOrCreateUser(req.headers['authorization']);
      const tokenId = jsonBody.token_id;
      const currentUid = room.turn_order[room.current_turn_index];
      if (currentUid === user.id && room.dice_rolled && room.status === 'in_game') {
        if (room.legal_tokens.includes(tokenId)) {
          const p = room.players[user.id];
          const { captured, finished } = executeMove(room, p, tokenId, room.dice_value);
          room.version++;
          if (p.finished) {
            room.winner_id = user.id;
            room.status = 'finished';
          } else {
            const grantExtraTurn = room.dice_value === 6 || captured;
            room.dice_rolled = false;
            room.legal_tokens = [];
            if (!grantExtraTurn) {
              room.current_turn_index = (room.current_turn_index + 1) % room.turn_order.length;
            }
          }
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(room));
      return;
    }

    // QUICK MATCH (Matchmaking)
    if (pathname === '/api/matchmaking/join' && req.method === 'POST') {
      const user = getOrCreateUser(req.headers['authorization'], jsonBody.username || 'MatchPlayer');
      const capacity = Math.min(Math.max(parseInt(jsonBody.capacity) || 2, 2), 4);

      // Find an available waiting room
      let foundRoom = null;
      for (const [code, r] of roomsByCode.entries()) {
        if (r.status === 'lobby' && r.capacity === capacity && Object.keys(r.players).length < capacity) {
          foundRoom = r;
          break;
        }
      }

      if (foundRoom) {
        // Join this existing room
        const currentCount = Object.keys(foundRoom.players).length;
        const colors = capacity === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
        const usedColors = new Set(Object.values(foundRoom.players).map(p => p.color));
        const color = colors.find(c => !usedColors.has(c)) || 'yellow';

        foundRoom.players[user.id] = {
          user_id: user.id,
          username: user.username,
          color,
          seat: currentCount,
          tokens: [0, 1, 2, 3].map(id => ({ id, position: -1, color, steps: -1 })),
          is_ready: true,
          is_online: true,
          finished: false,
        };
        foundRoom.turn_order.push(user.id);
        foundRoom.version++;

        // If room is full, start the game immediately!
        if (Object.keys(foundRoom.players).length === capacity) {
          foundRoom.status = 'in_game';
          foundRoom.current_turn_index = 0;
          foundRoom.dice_value = null;
          foundRoom.dice_rolled = false;
          broadcastToRoom(foundRoom.code, 'game.started', foundRoom);
        } else {
          broadcastToRoom(foundRoom.code, 'room.player_joined', foundRoom);
        }

        const token = createToken({ sub: user.id, username: user.username, email: user.email });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ room: foundRoom, token, user, matched: true }));
        return;
      } else {
        // Create new room and wait for others
        const code = 'QUICK' + crypto.randomBytes(2).toString('hex').toUpperCase();
        const colors = capacity === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
        const color = colors[0];

        const room = {
          code,
          host_id: user.id,
          capacity,
          status: 'lobby',
          players: {
            [user.id]: {
              user_id: user.id,
              username: user.username,
              color,
              seat: 0,
              tokens: [0, 1, 2, 3].map(id => ({ id, position: -1, color, steps: -1 })),
              is_ready: true,
              is_online: true,
              finished: false,
            }
          },
          turn_order: [user.id],
          current_turn_index: 0,
          dice_value: null,
          dice_rolled: false,
          consecutive_sixes: 0,
          legal_tokens: [],
          winner_id: '',
          version: 1,
          created_at: new Date().toISOString(),
        };

        roomsByCode.set(code, room);
        const token = createToken({ sub: user.id, username: user.username, email: user.email });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ room, token, user, matched: false }));
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });
}

// WebSocket Upgrade Handler
function handleWsUpgrade(req, socket, head) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  if (parsedUrl.pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const tokenStr = parsedUrl.searchParams.get('token');
  const roomCode = (parsedUrl.searchParams.get('room') || '').toUpperCase();
  let authUser = verifyToken(tokenStr);

  if (!authUser) {
    // Permissive fallback for guest web/mobile sockets
    const guestId = `guest_${Date.now()}`;
    authUser = { sub: guestId, username: 'Player' };
  }

  const secKey = req.headers['sec-websocket-key'];
  const acceptKey = crypto.createHash('sha1').update(secKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
  );

  const client = {
    userId: authUser.sub,
    roomCode,
    socket,
  };
  wsClients.add(client);

  socket.on('close', () => {
    wsClients.delete(client);
    const room = roomsByCode.get(roomCode);
    if (room && room.players[client.userId]) {
      room.players[client.userId].is_online = false;
      broadcastToRoom(roomCode, 'game.player_disconnected', { user_id: client.userId, room });
    }
  });

  socket.on('data', buffer => {
    if (buffer.length < 2) return;
    const isMasked = (buffer[1] & 0x80) === 0x80;
    let payloadLength = buffer[1] & 0x7f;
    let offset = 2;

    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(2);
      offset = 4;
    } else if (payloadLength === 127) {
      payloadLength = Number(buffer.readBigUInt64BE(2));
      offset = 10;
    }

    let maskingKey = null;
    if (isMasked) {
      maskingKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    const payload = buffer.slice(offset, offset + payloadLength);
    if (isMasked && maskingKey) {
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskingKey[i % 4];
      }
    }

    try {
      const msgStr = payload.toString('utf8');
      const { event, payload: evPayload } = JSON.parse(msgStr);
      const room = roomsByCode.get(roomCode);
      if (!room) return;

      if (event === 'room.ready') {
        const p = room.players[client.userId];
        if (p) {
          p.is_ready = !p.is_ready;
          broadcastToRoom(roomCode, 'room.updated', room);
        }
      } else if (event === 'game.start') {
        if (room.host_id === client.userId && room.status === 'lobby' && Object.keys(room.players).length >= 2) {
          room.status = 'in_game';
          room.current_turn_index = 0;
          room.dice_value = null;
          room.dice_rolled = false;
          room.version++;
          broadcastToRoom(roomCode, 'game.started', room);
        }
      } else if (event === 'game.roll_dice') {
        const currentUid = room.turn_order[room.current_turn_index];
        if (currentUid === client.userId && !room.dice_rolled && room.status === 'in_game') {
          const val = crypto.randomInt(1, 7);
          room.dice_value = val;
          room.dice_rolled = true;
          if (val === 6) room.consecutive_sixes++;
          else room.consecutive_sixes = 0;

          if (room.consecutive_sixes === 3) {
            room.consecutive_sixes = 0;
            room.dice_rolled = false;
            room.legal_tokens = [];
            room.current_turn_index = (room.current_turn_index + 1) % room.turn_order.length;
            broadcastToRoom(roomCode, 'game.turn_changed', room);
          } else {
            const p = room.players[client.userId];
            const legal = calculateLegalMoves(p, val);
            room.legal_tokens = legal;
            broadcastToRoom(roomCode, 'game.dice_result', {
              dice: val,
              legal_tokens: legal,
              player_id: client.userId,
              room,
            });

            if (legal.length === 0) {
              setTimeout(() => {
                room.dice_rolled = false;
                room.legal_tokens = [];
                room.current_turn_index = (room.current_turn_index + 1) % room.turn_order.length;
                broadcastToRoom(roomCode, 'game.turn_changed', room);
              }, 1200);
            }
          }
        }
      } else if (event === 'game.move_token') {
        const tokenId = evPayload?.token_id;
        const currentUid = room.turn_order[room.current_turn_index];
        if (currentUid === client.userId && room.dice_rolled && room.status === 'in_game') {
          if (room.legal_tokens.includes(tokenId)) {
            const p = room.players[client.userId];
            const { captured, capturedPlayerId, finished } = executeMove(room, p, tokenId, room.dice_value);
            room.version++;

            broadcastToRoom(roomCode, 'game.token_moved', {
              token_id: tokenId,
              player_id: client.userId,
              captured,
              captured_player_id: capturedPlayerId,
              finished,
              room,
            });

            if (p.finished) {
              room.winner_id = client.userId;
              room.status = 'finished';
              broadcastToRoom(roomCode, 'game.player_won', {
                winner_id: client.userId,
                room,
              });
              matchHistory.unshift({
                id: `hist_${Date.now()}`,
                room_code: roomCode,
                winner_id: client.userId,
                mode: 'online',
                duration_sec: 240,
                created_at: new Date().toISOString(),
              });
            } else {
              const grantExtraTurn = room.dice_value === 6 || captured;
              room.dice_rolled = false;
              room.legal_tokens = [];
              if (!grantExtraTurn) {
                room.current_turn_index = (room.current_turn_index + 1) % room.turn_order.length;
              }
              broadcastToRoom(roomCode, 'game.turn_changed', room);
            }
          }
        }
      }
    } catch (e) {
      console.error('WS parse error:', e);
    }
  });
}

const server = http.createServer(handleHttpRequest);
server.on('upgrade', handleWsUpgrade);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 HeySakhi Ludo Server (REST + WebSockets) running on http://localhost:${PORT}`);
  });
}

module.exports = {
  handleHttpRequest,
  handleWsUpgrade,
  server,
  PORT,
};
