

class QuizGame {
    constructor() {
        this.currentPlayer = null;
        this.currentRoom = null;
        this.currentSession = null;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.isHost = false;
        this.isGameEnded = false;
        this.subscriptions = [];
        this.syncInterval = null;
    }

    async initialize() {
        if (window.discordAuth && window.discordAuth.isLoggedIn()) {
            const user = window.discordAuth.getCurrentUser();
            if (user) {
                await this.setPlayer(user.discord_id);
                const pendingAction = localStorage.getItem('pendingAction');
                if (pendingAction === 'create-room') {
                    localStorage.removeItem('pendingAction');
                    ui.showCreateRoomSettings();
                    return;
                }
            }
        }

        const roomCode = getRoomCodeFromURL();
        if (roomCode) {
            sessionStorage.setItem('pendingRoomCode', roomCode);
            if (this.currentPlayer) await this.joinRoomByCode(roomCode);
            else ui.showScreen('discord-input');
        } else {
            ui.showScreen('menu');
        }

        window.addEventListener('beforeunload', () => {
            if (this.currentSession) {
                db.leaveRoom(this.currentSession.id);
            }
        });
    }

    async setPlayer(discordId, skipNavigation = false) {
        if (!discordId) {
            console.error('[setPlayer] No discordId provided');
            return false;
        }

        console.log('[setPlayer] Starting with discordId:', discordId, 'skipNavigation:', skipNavigation);

        const result = await db.createOrGetPlayer(discordId);

        console.log('[setPlayer] createOrGetPlayer result:', result);

        if (!result.success) {
            console.error('[setPlayer] Failed to create/get player:', result.error);
            showNotification(result.error, 'error');
            return false;
        }

        this.currentPlayer = result.player;
        console.log('[setPlayer] Player set successfully:', this.currentPlayer);

        if (!skipNavigation) {
            const pendingRoomCode = sessionStorage.getItem('pendingRoomCode');
            const pendingAction = localStorage.getItem('pendingAction');

            if (pendingRoomCode) {
                sessionStorage.removeItem('pendingRoomCode');
                await this.joinRoomByCode(pendingRoomCode);
            } else if (pendingAction === 'create-room') {
                localStorage.removeItem('pendingAction');
                ui.showCreateRoomSettings();
            } else {
                ui.showScreen('menu');
            }
        }

        console.log('[setPlayer] Returning true');
        return true;
    }

    async createRoom(difficulty, scoreLimit, questionsMode) {
        if (!this.currentPlayer) { ui.showScreen('discord-input'); return; }
        ui.showLoading(true);
        const result = await db.createRoom(this.currentPlayer.discord_id, difficulty, scoreLimit, questionsMode);
        ui.showLoading(false);

        if (result.success) {
            this.currentRoom = result.room;
            this.currentSession = result.session;
            this.isHost = true;
            this.roomSessionIds = new Set([this.currentSession.id]);
            this.subscribeToRoom();
            const link = generateShareableLink(this.currentRoom.room_code);
            ui.showLobby(this.currentRoom, link, true);
            ui.showLobby(this.currentRoom, link, true);
            if (typeof soundManager !== 'undefined') {
                soundManager.playRoomCreated();
            }
        } else {
            showNotification(result.error, 'error');
            if (typeof soundManager !== 'undefined') {
                soundManager.playError();
            }
        }
    }

    async joinRoomByCode(roomCode) {
        if (!this.currentPlayer) { ui.showScreen('discord-input'); return; }
        ui.showLoading(true);
        const roomResult = await db.getRoomByCode(roomCode);
        if (!roomResult.success) {
            ui.showLoading(false);
            showNotification('Room not found', 'error');
            ui.showScreen('menu');
            return;
        }
        this.currentRoom = roomResult.room;

        const sessionsRes = await db.getSessionsByRoom(this.currentRoom.id);
        if (sessionsRes.success) {
            const isDiscord = window.discordAuth && window.discordAuth.isLoggedIn();
            if (!isDiscord) {
                const isDup = sessionsRes.sessions.some(s => s.player_discord_id.toLowerCase() === this.currentPlayer.discord_id.toLowerCase());
                if (isDup) {
                    ui.showLoading(false);
                    showNotification('Name taken!', 'error');
                    this.currentPlayer = null;
                    ui.showScreen('discord-input');
                    return;
                }

                const isDiscordUsername = await db.isDiscordAuthenticatedUsername(this.currentPlayer.discord_id);
                if (isDiscordUsername) {
                    ui.showLoading(false);
                    showNotification('This username already taken!', 'error');
                    this.currentPlayer = null;
                    ui.showScreen('discord-input');
                    return;
                }
            }
        }

        const joinResult = await db.joinRoom(this.currentRoom.id, this.currentPlayer.discord_id, false);

        if (joinResult.success || joinResult.alreadyJoined) {
            this.currentSession = joinResult.session;

            if (joinResult.alreadyJoined && !joinResult.session.discord_user_id && window.discordAuth && window.discordAuth.isLoggedIn()) {
                await db.leaveRoom(joinResult.session.id);
                const retry = await db.joinRoom(this.currentRoom.id, this.currentPlayer.discord_id, false);
                this.currentSession = retry.session;
            }

            this.subscribeToRoom();
            const link = generateShareableLink(this.currentRoom.room_code);

            if (this.currentRoom.status === 'active') {
                console.log("Rejoining active game...");

                await this.loadQuestions();

                const savedState = JSON.parse(sessionStorage.getItem('gameState'));
                if (savedState && savedState.roomId === this.currentRoom.id) {
                    this.currentQuestionIndex = savedState.qIndex;
                } else {
                    this.currentQuestionIndex = 0;
                }

                ui.showLoading(false);
                this.showCurrentQuestion();
                showNotification('Reconnected to game!', 'success');
            } else {
                ui.showLoading(false);
                ui.showLobby(this.currentRoom, link, false);
                showNotification('Joined!', 'success');
            }
        } else {
            ui.showLoading(false);
            showNotification(joinResult.error, 'error');
        }
    }

    subscribeToRoom() {
        if (!this.currentRoom) return;

        this.cleanup();
        this.roomSessionIds = new Set();

        const roomSub = db.supabase.channel(`public:game_rooms:${this.currentRoom.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${this.currentRoom.id}` },
                async (payload) => {
                    if (payload.new && payload.new.status === 'active') {
                        console.log("Game Start Signal Received!");
                        this.currentRoom = payload.new;

                        if (!this.isHost && !this.isGameEnded) {
                            const freshRoom = await db.getRoomByCode(this.currentRoom.room_code);
                            if (freshRoom.success) this.currentRoom = freshRoom.room;

                            showNotification('Game Started!', 'success');
                            showNotification('Game Started!', 'success');
                            if (typeof soundManager !== 'undefined') {
                                soundManager.playGameStart();
                            }
                            await this.loadQuestions();
                        }
                    }
                })
            .subscribe();
        this.subscriptions.push(roomSub);


        const sessionSub = db.supabase.channel(`public:game_sessions:${this.currentRoom.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' },
                (payload) => {
                    const record = payload.new || payload.old;
                    if (record && record.room_id === this.currentRoom.id) {
                        this.refreshPlayerList();
                    }
                })
            .subscribe();
        this.subscriptions.push(sessionSub);

        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            if (this.currentRoom && !this.isGameEnded) {
                if (this.currentRoom.status === 'waiting') {
                    db.getRoomByCode(this.currentRoom.room_code).then(res => {
                        if (res.success && res.room.status === 'active' && !this.isHost) {
                            console.log("Force Start via Heartbeat");
                            this.currentRoom = res.room;
                            this.loadQuestions();
                        }
                    });
                }
                this.refreshPlayerList();
                if (this.currentRoom.score_limit > 0 && this.currentRoom.status === 'active') {
                    this.checkForWinner();
                }
            }
        }, 2000);

        this.refreshPlayerList();
    }

    async refreshPlayerList() {
        if (!this.currentRoom) return;
        const res = await db.getSessionsByRoom(this.currentRoom.id);
        if (res.success) {
            this.roomSessionIds = new Set(res.sessions.map(s => s.id));
            ui.updatePlayerList(res.sessions);
            if (this.currentRoom.status === 'active' && this.currentRoom.score_limit > 0) {
                ui.updateLiveLeaderboard(res.sessions, this.currentRoom.score_limit);
            }
        }
    }

    async checkForWinner() {
        if (!this.currentRoom || this.isGameEnded) return;
        const res = await db.getSessionsByRoom(this.currentRoom.id);
        if (res.success) {
            const winner = res.sessions.find(s => s.total_score >= this.currentRoom.score_limit);
            if (winner) {
                const winnerName = (winner.discord_users && winner.discord_users.username)
                    ? winner.discord_users.username
                    : winner.player_discord_id;

                console.log('Winner detected:', winnerName);
                this.isGameEnded = true;
                clearInterval(this.timer);

                if (winner.player_discord_id === this.currentPlayer.discord_id) {
                    showNotification('🎉 You Won! 🎉', 'success');
                    if (typeof soundManager !== 'undefined') {
                        soundManager.playAchievement();
                    }
                } else {
                    showNotification(`🏆 ${winnerName} Won!`, 'info');
                    if (typeof soundManager !== 'undefined') {
                        soundManager.playNotification();
                    }
                }

                setTimeout(() => {
                    this.endGame();
                }, 2500);
            }
        }
    }

    async startGame() {
        if (!this.isHost) return;
        ui.showLoading(true);

        let qIds = null;

        if (this.currentRoom.questions_mode === 'same') {
            const res = await db.getRandomQuestions(this.currentRoom.total_questions || 20, this.currentRoom.difficulty);
            if (res.success && res.questions.length > 0) {
                this.questions = res.questions;
                qIds = this.questions.map(q => q.id);
            } else {
                ui.showLoading(false);
                showNotification('No questions found! Check database or difficulty.', 'error');
                return;
            }
        }

        const upRes = await db.updateRoomStatus(this.currentRoom.id, 'active', qIds);
        if (upRes.success) {
            this.currentRoom = upRes.room;

            if (this.currentRoom.questions_mode !== 'same') {
                await this.loadQuestions();
            } else {
                if (this.questions && this.questions.length > 0) {
                    this.currentQuestionIndex = 0;
                    this.showCurrentQuestion();
                } else {
                    ui.showLoading(false);
                    showNotification('Error: Questions array is empty.', 'error');
                    return;
                }
            }
        } else {
            showNotification('Failed to start game.', 'error');
            if (typeof soundManager !== 'undefined') {
                soundManager.playError();
            }
        }
        ui.showLoading(false);
        if (this.isHost && typeof soundManager !== 'undefined') {
            soundManager.playGameStart();
        }
    }

    async loadQuestions() {
        ui.showLoading(true);
        let success = false;

        if (this.currentRoom.question_ids && this.currentRoom.question_ids.length > 0) {
            const res = await db.getQuestionsByIds(this.currentRoom.question_ids);
            if (res.success) { this.questions = res.questions; success = true; }
        } else if (this.currentRoom.questions_mode === 'same') {
            const res = await db.getRandomQuestions(this.currentRoom.total_questions || 20, this.currentRoom.difficulty);
            if (res.success) { this.questions = res.questions; success = true; }
        } else {
            const res = await db.getRandomQuestions(this.currentRoom.total_questions || 20, this.currentRoom.difficulty);
            if (res.success) { this.questions = res.questions; success = true; }
        }

        ui.showLoading(false);

        if (success && this.questions.length > 0) {
            if (!this.currentQuestionIndex) this.currentQuestionIndex = 0;

            if (this.currentRoom.status === 'active') {
                this.showCurrentQuestion();
            }
            this.refreshPlayerList();
        } else {
            showNotification('Could not load questions. Database might be empty.', 'error');
        }
    }

    showCurrentQuestion() {
        if (this.isGameEnded) return;

        if (!this.questions || this.questions.length === 0) {
            console.error('showCurrentQuestion called with empty questions array');
            return;
        }

        if (this.currentQuestionIndex >= this.questions.length) { this.endGame(); return; }

        sessionStorage.setItem('gameState', JSON.stringify({
            roomId: this.currentRoom.id,
            qIndex: this.currentQuestionIndex,
            timestamp: Date.now()
        }));

        const q = this.questions[this.currentQuestionIndex];
        this.questionStartTime = Date.now();
        ui.showQuestion(q, this.currentQuestionIndex + 1, this.questions.length, this.currentRoom.score_limit);
        this.startQuestionTimer();
    }

    startQuestionTimer() {
        if (this.timer) clearInterval(this.timer);
        let dur = (this.currentRoom?.difficulty === 'hard') ? 10000 : 15000;
        const end = Date.now() + dur;
        ui.updateTimer(dur);
        this.timer = setInterval(() => {
            const left = end - Date.now();
            if (left <= 0) { clearInterval(this.timer); ui.updateTimer(0); this.handleTimeout(); }
            else ui.updateTimer(left);
        }, 100);
    }

    async submitAnswer(key, correctKey) {
        if (!this.questionStartTime) return;
        clearInterval(this.timer);
        const time = Date.now() - this.questionStartTime;
        const q = this.questions[this.currentQuestionIndex];

        const origAns = ui.currentAnswerMapping[key];

        const res = await db.saveAnswer(this.currentSession.id, q.id, origAns, correctKey, time);

        if (res.success) {
            if (origAns === correctKey) {
                this.currentSession.total_score = (this.currentSession.total_score || 0) + res.pointsEarned;
            }

            ui.showAnswerResult(origAns === correctKey, res.pointsEarned, ui.currentCorrectDisplayKey, key);

            if (this.currentRoom.score_limit > 0 && this.currentSession.total_score >= this.currentRoom.score_limit) {
                setTimeout(() => { this.endGame(); }, 2000);
                return;
            }
        }

        setTimeout(() => { this.currentQuestionIndex++; this.showCurrentQuestion(); }, 3000);
    }

    handleTimeout() {
        if (!this.questionStartTime) return;
        const q = this.questions[this.currentQuestionIndex];
        db.saveAnswer(this.currentSession.id, q.id, '', q.correct_answer, 15000);

        ui.showAnswerResult(false, 0, ui.currentCorrectDisplayKey, null);

        setTimeout(() => { this.currentQuestionIndex++; this.showCurrentQuestion(); }, 3000);
    }

    async endGame() {
        this.isGameEnded = true;
        sessionStorage.removeItem('gameState');
        const res = await db.getSessionsByRoom(this.currentRoom.id);
        if (res.success) ui.showFinalResults(res.sessions, this.currentPlayer.discord_id);
        this.cleanup();
    }

    async startSinglePlayer(diff, total) {
        if (!this.currentPlayer) { const id = `Guest_${Math.floor(Math.random() * 9000) + 1000}`; await this.setPlayer(id); }
        ui.showLoading(true);
        const res = await db.createRoom(this.currentPlayer.discord_id, diff, 0, 'same', total);
        if (res.success) {
            this.currentRoom = res.room;
            this.currentSession = res.session;
            this.isHost = true;
            this.roomSessionIds = new Set([this.currentSession.id]);
            await this.startGame();
        }
        ui.showLoading(false);
    }

    cleanup() {
        this.subscriptions.forEach(s => s && s.unsubscribe());
        this.subscriptions = [];
        if (this.syncInterval) clearInterval(this.syncInterval);
        if (this.timer) clearInterval(this.timer);
    }

    async leaveRoom() {
        if (this.currentSession) await db.leaveRoom(this.currentSession.id);
        this.cleanup();
        sessionStorage.removeItem('gameState');
        this.currentRoom = null; this.currentSession = null; this.isHost = false;
        ui.showScreen('menu');
        window.history.replaceState({}, document.title, window.location.pathname);
        showNotification('Left the lobby', 'success');
        showNotification('Left the lobby', 'success');
        if (typeof soundManager !== 'undefined') {
            soundManager.playNotification();
        }
    }

    reset() { this.cleanup(); this.currentPlayer = null; this.currentRoom = null; this.currentSession = null; this.questions = []; this.isGameEnded = false; }
}

const game = new QuizGame();
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('code')) game.initialize();
});
