-- Stork Oracle Quiz - Database Setup
-- Clean setup script for PostgreSQL/Supabase

-- Drop existing tables
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS game_rooms CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS discord_users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discord_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game rooms table
CREATE TABLE game_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code TEXT UNIQUE NOT NULL,
    host_discord_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    total_questions INTEGER DEFAULT 20,
    current_question_index INTEGER DEFAULT 0,
    difficulty TEXT DEFAULT 'mixed',
    score_limit INTEGER DEFAULT 0,
    questions_mode TEXT DEFAULT 'same',
    question_ids JSONB,
    CONSTRAINT valid_status CHECK (status IN ('waiting', 'active', 'finished'))
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_answer CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard'))
);

-- Discord Users table (for profiles)
CREATE TABLE discord_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    discriminator TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    player_discord_id TEXT NOT NULL,
    discord_user_id TEXT REFERENCES discord_users(id),
    current_question_index INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_host BOOLEAN DEFAULT FALSE,
    UNIQUE(room_id, player_discord_id)
);

-- Answers table
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    player_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    time_taken INTEGER NOT NULL,
    points_earned INTEGER NOT NULL,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_player_answer CHECK (player_answer IN ('a', 'b', 'c', 'd') OR player_answer IS NULL)
);

-- Create indexes
CREATE INDEX idx_game_rooms_room_code ON game_rooms(room_code);
CREATE INDEX idx_game_rooms_status ON game_rooms(status);
CREATE INDEX idx_game_sessions_room_id ON game_sessions(room_id);
CREATE INDEX idx_game_sessions_player ON game_sessions(player_discord_id);
CREATE INDEX idx_answers_session_id ON answers(session_id);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all on players" ON players;
DROP POLICY IF EXISTS "Allow all on game_rooms" ON game_rooms;
DROP POLICY IF EXISTS "Allow all on questions" ON questions;
DROP POLICY IF EXISTS "Allow all on game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Allow all on answers" ON answers;
DROP POLICY IF EXISTS "Allow all on discord_users" ON discord_users;

-- Create RLS policies
CREATE POLICY "Allow all on players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on game_rooms" ON game_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on questions" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on game_sessions" ON game_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on answers" ON answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on discord_users" ON discord_users FOR ALL USING (true) WITH CHECK (true);
