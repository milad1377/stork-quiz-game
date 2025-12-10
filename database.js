
class Database {
    constructor() {
        if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.KEY) {
            console.error('Supabase config missing!');
            return;
        }
        this.supabase = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
    }

    async createOrUpdateDiscordUser(userData) {
        try {
            const { data, error } = await this.supabase.from('discord_users').upsert({
                id: userData.discord_id,
                username: userData.username,
                discriminator: userData.discriminator,
                avatar_url: userData.avatar_url,
                updated_at: new Date().toISOString()
            }).select().single();
            if (error) throw error;
            return { success: true, user: data };
        } catch (error) { return { success: false, error: error.message }; }
    }

    async getDiscordUser(discordId) {
        try {
            const { data, error } = await this.supabase.from('discord_users').select('*').eq('id', discordId).single();
            if (error) return { success: false, error: error.message };
            return { success: true, user: data };
        } catch (error) { return { success: false, error: error.message }; }
    }

    async isDiscordAuthenticatedUsername(username) {
        try {
            const { data, error } = await this.supabase
                .from('discord_users')
                .select('id')
                .ilike('username', username)
                .single();

            return data !== null;
        } catch (error) {
            return false;
        }
    }

    async createOrGetPlayer(discordId) {
        try {
            console.log('[createOrGetPlayer] Starting with discordId:', discordId);

            const idStr = String(discordId);
            console.log('[createOrGetPlayer] Converted to string:', idStr);

            const { data: existingPlayer } = await this.supabase.from('players').select('*').eq('discord_id', idStr).single();

            if (existingPlayer) {
                console.log('[createOrGetPlayer] Found existing player:', existingPlayer);
                return { success: true, player: existingPlayer };
            }

            console.log('[createOrGetPlayer] No existing player, creating new one');

            const { data: newPlayer, error } = await this.supabase.from('players').insert([{ discord_id: idStr }]).select().single();

            if (error) {
                console.error('[createOrGetPlayer] Insert error:', error);
                if (error.code === '23505') {
                    console.log('[createOrGetPlayer] Unique constraint violation, retrying select');
                    const { data: retryPlayer, error: retryError } = await this.supabase.from('players').select('*').eq('discord_id', idStr).single();
                    if (retryError) {
                        console.error('[createOrGetPlayer] Retry select error:', retryError);
                        throw retryError;
                    }
                    console.log('[createOrGetPlayer] Retry successful:', retryPlayer);
                    return { success: true, player: retryPlayer };
                }
                throw error;
            }

            console.log('[createOrGetPlayer] Created new player:', newPlayer);
            return { success: true, player: newPlayer };
        } catch (error) {
            console.error('[createOrGetPlayer] Catch block error:', error);
            return { success: false, error: error.message };
        }
    }

    async createRoom(hostDiscordId, difficulty, scoreLimit, questionsMode, totalQuestions) {
        try {
            let roomCode;
            let attempts = 0;
            while (attempts < 10) {
                roomCode = generateRoomCode();
                const { data: existing } = await this.supabase.from('game_rooms').select('id').eq('room_code', roomCode).single();
                if (!existing) break;
                attempts++;
            }
            if (attempts === 10) throw new Error('Failed to generate room code');

            const { data: room, error } = await this.supabase.from('game_rooms').insert([{
                room_code: roomCode,
                host_discord_id: hostDiscordId,
                difficulty: difficulty || 'mixed',
                score_limit: scoreLimit || 0,
                questions_mode: questionsMode || 'same',
                total_questions: totalQuestions || 20,
                status: 'waiting'
            }]).select().single();

            if (error) throw error;

            const joinResult = await this.joinRoom(room.id, hostDiscordId, true);

            if (!joinResult.success) {
                throw new Error(joinResult.error || 'Failed to join room as host');
            }

            return { success: true, room, session: joinResult.session };
        } catch (error) {
            console.error('createRoom error:', error);
            return { success: false, error: error.message };
        }
    }

    async getRoomByCode(roomCode) {
        try {
            const { data: room, error } = await this.supabase.from('game_rooms').select('*').eq('room_code', roomCode).single();
            if (error) throw error;
            return { success: true, room };
        } catch (error) { return { success: false, error: error.message }; }
    }

    async updateRoomStatus(roomId, status, questionIds = null) {
        try {
            const updateData = { status };
            if (status === 'active') updateData.started_at = new Date().toISOString();
            if (questionIds) updateData.question_ids = questionIds;
            const { data, error } = await this.supabase.from('game_rooms').update(updateData).eq('id', roomId).select().single();
            if (error) throw error;
            return { success: true, room: data };
        } catch (error) { return { success: false, error: error.message }; }
    }

    async joinRoom(roomId, discordId, isHost = false) {
        try {
            let discordUserId = null;
            let fullDiscordData = null;
            let isAuthenticated = false;

            if (window.discordAuth && window.discordAuth.isLoggedIn()) {
                const u = window.discordAuth.getCurrentUser();
                if (u) {
                    discordUserId = u.discord_id;
                    fullDiscordData = u;
                    if (String(discordId) === String(u.discord_id)) {
                        isAuthenticated = true;
                    }
                }
            }

            if (!isAuthenticated && !discordUserId) {
                try {
                    const s = localStorage.getItem('discord_user');
                    if (s) {
                        const p = JSON.parse(s);
                        if (String(discordId) === String(p.discord_id)) {
                            discordUserId = p.discord_id;
                            fullDiscordData = p;
                            isAuthenticated = true;
                        }
                    }
                } catch (e) { }
            }
            if (isAuthenticated && discordUserId && fullDiscordData) {
                await this.createOrUpdateDiscordUser(fullDiscordData);
            }

            const { data: existing } = await this.supabase.from('game_sessions').select('*').eq('room_id', roomId).eq('player_discord_id', discordId).single();
            if (existing) {
                if (!existing.discord_user_id && isAuthenticated && discordUserId) {
                    await this.supabase.from('game_sessions').update({ discord_user_id: discordUserId }).eq('id', existing.id);
                    existing.discord_user_id = discordUserId;
                }
                return { success: true, session: existing, alreadyJoined: true };
            }
            const { data: session, error } = await this.supabase.from('game_sessions').insert([{
                room_id: roomId,
                player_discord_id: discordId,
                is_host: isHost,
                discord_user_id: isAuthenticated ? discordUserId : null
            }]).select().single();

            if (error) throw error;
            return { success: true, session, alreadyJoined: false };
        } catch (error) { return { success: false, error: error.message }; }
    }

    async leaveRoom(sessionId) {
        try {
            const { error } = await this.supabase.from('game_sessions').delete().eq('id', sessionId);
            if (error) throw error;
            return { success: true };
        } catch (error) { return { success: false, error: error.message }; }
    }

    async getSessionsByRoom(roomId) {
        try {
            const { data: sessions, error } = await this.supabase
                .from('game_sessions')
                .select('*')
                .eq('room_id', roomId)
                .order('joined_at', { ascending: true });

            if (error) throw error;
            const enrichedSessions = await Promise.all(sessions.map(async (session) => {
                if (session.discord_user_id) {
                    const { data: discordUser } = await this.supabase
                        .from('discord_users')
                        .select('username, avatar_url')
                        .eq('id', session.discord_user_id)
                        .single();

                    return { ...session, discord_users: discordUser };
                }
                return { ...session, discord_users: null };
            }));

            return { success: true, sessions: enrichedSessions };
        } catch (error) { return { success: false, error: error.message }; }
    }
    async getRandomQuestions(count, difficulty) {
        try {
            let query = this.supabase.from('questions').select('*');
            if (difficulty && difficulty !== 'mixed') query = query.eq('difficulty', difficulty);
            const { data, error } = await query;
            if (error) throw error;
            const shuffled = shuffleArray(data);
            return { success: true, questions: shuffled.slice(0, Math.min(count, shuffled.length)) };
        } catch (error) { return { success: false, error: error.message }; }
    }

    async getQuestionsByIds(ids) {
        try {
            const { data, error } = await this.supabase.from('questions').select('*').in('id', ids);
            if (error) throw error;
            const ordered = ids.map(id => data.find(q => q.id === id)).filter(q => q);
            return { success: true, questions: ordered };
        } catch (error) { return { success: false, error: error.message }; }
    }

    async saveAnswer(sessionId, questionId, playerAnswer, correctAnswer, timeTaken) {
        try {
            const isCorrect = playerAnswer === correctAnswer;
            const pointsEarned = calculateScore(isCorrect, timeTaken);
            const { data, error } = await this.supabase.from('answers').insert([{
                session_id: sessionId,
                question_id: questionId,
                player_answer: playerAnswer,
                is_correct: isCorrect,
                time_taken: timeTaken,
                points_earned: pointsEarned
            }]).select().single();
            if (isCorrect) {
                const { data: session } = await this.supabase.from('game_sessions').select('total_score').eq('id', sessionId).single();
                const newScore = (session ? session.total_score : 0) + pointsEarned;
                await this.supabase.from('game_sessions').update({ total_score: newScore }).eq('id', sessionId);
            }

            if (error) throw error;
            return { success: true, answer: data, pointsEarned };
        } catch (error) { return { success: false, error: error.message }; }
    }

    async getSessionStats(sessionId) {
        try {
            const { data: answers } = await this.supabase.from('answers').select('is_correct').eq('session_id', sessionId);
            const correct = answers.filter(a => a.is_correct).length;
            const incorrect = answers.filter(a => !a.is_correct).length;
            return { success: true, stats: { correct, incorrect, total: correct + incorrect } };
        } catch (error) { return { success: false, error: error.message }; }
    }

    subscribeToRoom(roomId, callback) {
        return this.supabase.channel(`room:${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
                payload => callback(payload))
            .subscribe();
    }

    subscribeToSessions(roomId, callback) {
        return this.supabase.channel(`sessions:${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `room_id=eq.${roomId}` },
                payload => callback(payload))
            .subscribe();
    }
}

window.db = new Database();
