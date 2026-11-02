/**
 * Automated Unit Tests for Ludo Engine
 * Runs in pure Node.js / TypeScript environment
 */

// Simple test runner
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    passed++;
  }
}

// Emulate module loading
const {
  initializeGame,
  rollDice,
  applyMove,
  getLegalMoves,
  SAFE_TILES,
  COLOR_START_INDEX,
  BOARD_TRACK_LENGTH,
} = require('./LudoEngine.js');

console.log('🧪 Starting HeySakhi Ludo Engine Unit Tests...\n');

// TEST 1: Initial Game Setup
(() => {
  const game = initializeGame([
    { name: 'Alice', color: 'red' },
    { name: 'Bob', color: 'blue' },
  ]);

  assert(game.players.length === 2, 'Two players initialized');
  assert(game.currentTurnIndex === 0, 'Alice starts first');
  assert(game.players[0].tokens.length === 4, 'Alice has 4 tokens');
  assert(game.players[0].tokens.every(t => t.position === -1), 'All tokens start in base (-1)');
  assert(game.turnStatus === 'awaiting_roll', 'Initial status is awaiting_roll');
})();

// TEST 2: Exiting Base requires rolling a 6
(() => {
  const game = initializeGame([
    { name: 'Alice', color: 'red' },
    { name: 'Bob', color: 'blue' },
  ]);

  // Roll a 5: Cannot move any token
  const stateAfter5 = rollDice(game, 5);
  assert(stateAfter5.legalTokenIds.length === 0, 'Rolling 5 with all tokens in base yields 0 legal moves');

  // Roll a 6: Can move any of the 4 tokens out
  const stateAfter6 = rollDice(game, 6);
  assert(stateAfter6.legalTokenIds.length === 4, 'Rolling 6 yields 4 legal tokens to move out');

  // Move token 0 out
  const { nextState, capturedToken, extraTurn } = applyMove(stateAfter6, 0);
  assert(nextState.players[0].tokens[0].position === COLOR_START_INDEX.red, 'Red token lands on start track position 0');
  assert(nextState.players[0].tokens[0].steps === 0, 'Steps set to 0');
  assert(extraTurn === true, 'Rolling a 6 grants an extra turn');
  assert(nextState.currentTurnIndex === 0, 'Still Alice’s turn due to extra turn');
})();

// TEST 3: Token Track Movement
(() => {
  const game = initializeGame([
    { name: 'Alice', color: 'red' },
    { name: 'Bob', color: 'blue' },
  ]);

  // Manually position Alice token 0 on track 0 with steps 0
  game.players[0].tokens[0].position = 0;
  game.players[0].tokens[0].steps = 0;

  // Alice rolls a 4
  const rolledState = rollDice(game, 4);
  assert(rolledState.legalTokenIds.includes(0), 'Token on track is legal to move');

  const { nextState, extraTurn } = applyMove(rolledState, 0);
  assert(nextState.players[0].tokens[0].position === 4, 'Token advances 4 steps from 0 to 4');
  assert(nextState.players[0].tokens[0].steps === 4, 'Steps updated to 4');
  assert(extraTurn === false, 'Rolling 4 without capture does not grant extra turn');
  assert(nextState.currentTurnIndex === 1, 'Turn transfers to Bob');
})();

// TEST 4: Capture Opponent Token on Vulnerable Cell
(() => {
  const game = initializeGame([
    { name: 'Alice', color: 'red' },
    { name: 'Bob', color: 'blue' },
  ]);

  // Position Bob's token at tile 10 (not safe)
  game.players[1].tokens[0].position = 10;
  game.players[1].tokens[0].steps = 20;

  // Position Alice's token at tile 6
  game.players[0].tokens[0].position = 6;
  game.players[0].tokens[0].steps = 6;

  // Alice rolls a 4 -> lands on 10!
  const rolled = rollDice(game, 4);
  const { nextState, capturedToken, extraTurn } = applyMove(rolled, 0);

  assert(capturedToken !== null, 'Capture detected');
  assert(capturedToken.player.name === 'Bob', 'Captured player is Bob');
  assert(nextState.players[1].tokens[0].position === -1, 'Bob’s captured token sent back to base (-1)');
  assert(extraTurn === true, 'Capture grants an extra turn');
  assert(nextState.currentTurnIndex === 0, 'Alice retains turn after capture');
})();

// TEST 5: Safe Tiles Protect From Capture
(() => {
  const game = initializeGame([
    { name: 'Alice', color: 'red' },
    { name: 'Bob', color: 'blue' },
  ]);

  // Star tile 8 is safe
  assert(SAFE_TILES.has(8), 'Tile 8 is safe tile');

  // Position Bob's token at safe tile 8
  game.players[1].tokens[0].position = 8;
  game.players[1].tokens[0].steps = 15;

  // Position Alice's token at tile 5, rolls 3 -> lands on 8
  game.players[0].tokens[0].position = 5;
  game.players[0].tokens[0].steps = 5;

  const rolled = rollDice(game, 3);
  const { nextState, capturedToken } = applyMove(rolled, 0);

  assert(capturedToken === null, 'No capture on safe tile 8');
  assert(nextState.players[1].tokens[0].position === 8, 'Bob’s token remains safe on tile 8');
  assert(nextState.players[0].tokens[0].position === 8, 'Alice’s token shares tile 8 peacefully');
})();

// TEST 6: Consecutive Three 6s Penalty
(() => {
  let game = initializeGame([
    { name: 'Alice', color: 'red' },
    { name: 'Bob', color: 'blue' },
  ]);

  // Move a token out so moves are possible
  game.players[0].tokens[0].position = 0;
  game.players[0].tokens[0].steps = 0;

  // Roll 6 #1
  game = rollDice(game, 6);
  assert(game.consecutiveSixes === 1, 'Consecutive sixes = 1');
  let res = applyMove(game, 0);
  game = res.nextState;

  // Roll 6 #2
  game = rollDice(game, 6);
  assert(game.consecutiveSixes === 2, 'Consecutive sixes = 2');
  res = applyMove(game, 0);
  game = res.nextState;

  // Roll 6 #3: Penalized! Turn forfeited immediately
  game = rollDice(game, 6);
  assert(game.consecutiveSixes === 0, 'Consecutive sixes reset to 0');
  assert(game.currentTurnIndex === 1, 'Turn transferred to Bob after three 6s');
  assert(game.turnStatus === 'awaiting_roll', 'Status is awaiting Bob to roll');
})();

// TEST 7: Home Column & Exact Finish Win Condition
(() => {
  const game = initializeGame([
    { name: 'Alice', color: 'red' },
    { name: 'Bob', color: 'blue' },
  ]);

  // Set Alice token 0 at step 54 (needs roll of 2 to finish at 56)
  game.players[0].tokens[0].position = 103;
  game.players[0].tokens[0].steps = 54;

  // Set tokens 1, 2, 3 already finished
  game.players[0].tokens[1].position = 999;
  game.players[0].tokens[1].steps = 56;
  game.players[0].tokens[2].position = 999;
  game.players[0].tokens[2].steps = 56;
  game.players[0].tokens[3].position = 999;
  game.players[0].tokens[3].steps = 56;

  // Roll a 4: Cannot overshoot (54 + 4 = 58 > 56)
  const roll4 = rollDice(game, 4);
  assert(!roll4.legalTokenIds.includes(0), 'Cannot overshoot finish tile with roll of 4');

  // Roll exact 2: Reaches finish
  const roll2 = rollDice(game, 2);
  assert(roll2.legalTokenIds.includes(0), 'Roll of 2 is legal to reach finish exactly');

  const { nextState, reachedHome, won } = applyMove(roll2, 0);
  assert(reachedHome === true, 'Token reached home');
  assert(won === true, 'Alice has won the game!');
  assert(nextState.turnStatus === 'finished', 'Game status transitioned to finished');
  assert(nextState.winner.name === 'Alice', 'Winner recorded as Alice');
})();

console.log(`\n🎉 All ${passed} Ludo Engine tests passed with 0 failures!`);

