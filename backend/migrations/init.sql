-- HeySakhi Ludo Database Initial Schema
-- PostgreSQL 16+

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(50) DEFAULT 'avatar_1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_rooms (
    id VARCHAR(64) PRIMARY KEY,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    host_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    capacity INT NOT NULL DEFAULT 4,
    status VARCHAR(20) NOT NULL DEFAULT 'lobby',
    winner_id VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_players (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) REFERENCES game_rooms(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    color VARCHAR(10) NOT NULL,
    seat INT NOT NULL,
    is_ready BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_statistics (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    games_played INT DEFAULT 0,
    games_won INT DEFAULT 0,
    games_lost INT DEFAULT 0,
    total_captures INT DEFAULT 0,
    win_percentage NUMERIC(5,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS match_history (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) REFERENCES game_rooms(id) ON DELETE SET NULL,
    winner_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    mode VARCHAR(20) NOT NULL,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial test user
INSERT INTO users (id, username, email, password_hash, avatar)
VALUES (
    'usr_demo_1',
    'SakhiMaster',
    'player@heysakhi.com',
    '$2a$10$e8w.p4M7vFm3c2K0Z7m/eeL1uH6B2hJ4.2FhN0.4E8Qk3i1q7m.9u',
    'avatar_1'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO user_statistics (user_id, games_played, games_won, games_lost, total_captures, win_percentage)
VALUES ('usr_demo_1', 12, 9, 3, 24, 75.00)
ON CONFLICT (user_id) DO NOTHING;

