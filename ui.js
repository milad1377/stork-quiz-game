

class UI {
    constructor() {
        this.currentScreen = null;
        this.currentAnswerMapping = {};
        this.currentCorrectDisplayKey = null;
        this.lastPlayerCount = 0;
        this.pendingAction = null;
        this.defaultAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';
        this.announcedPlayers = new Set();
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;
            this.currentScreen = screenName;
            if (typeof soundManager !== 'undefined') {
                soundManager.playWhoosh();
            }
        }
    }

    showLoading(show) {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    setupDiscordInput() {
        const form = document.getElementById('discord-form');
        const input = document.getElementById('discord-input');

        if (form && input) {
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            const newInput = document.getElementById('discord-input');

            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = newInput.value.trim();
                if (username) {
                    localStorage.removeItem('discord_user');
                    if (window.discordAuth) window.discordAuth.currentUser = null;

                    await game.setPlayer(username);
                }
            });
        }

        const discordBtn = document.getElementById('discord-oauth-btn');
        if (discordBtn) {
            const newBtn = discordBtn.cloneNode(true);
            discordBtn.parentNode.replaceChild(newBtn, discordBtn);

            newBtn.onclick = () => {
                if (window.discordAuth) {
                    const pendingRoom = sessionStorage.getItem('pendingRoomCode');
                    if (pendingRoom) {
                        localStorage.setItem('oauth_pending_room', pendingRoom);
                    }
                    window.discordAuth.login();
                } else {
                    alert("Auth system not loaded!");
                }
            };
        }

        const backBtn = document.getElementById('discord-back-btn');
        if (backBtn) {
            const newBtn = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBtn, backBtn);

            newBtn.onclick = () => {
                this.showScreen('menu');
            };
        }
    }

    setupMenu() {
        const singlePlayerBtn = document.getElementById('single-player-btn');
        const createBtn = document.getElementById('create-room-btn');

        if (singlePlayerBtn) {
            const newBtn = singlePlayerBtn.cloneNode(true);
            singlePlayerBtn.parentNode.replaceChild(newBtn, singlePlayerBtn);

            newBtn.addEventListener('click', async () => {
                this.showSinglePlayerSettings();
            });
        }

        if (createBtn) {
            const newBtn = createBtn.cloneNode(true);
            createBtn.parentNode.replaceChild(newBtn, createBtn);

            newBtn.addEventListener('click', () => {
                if (game.currentPlayer) {
                    this.showCreateRoomSettings();
                } else {
                    localStorage.setItem('pendingAction', 'create-room');
                    this.showScreen('discord-input');
                }
            });
        }
    }

    showCreateRoomSettings() {
        this.showScreen('create-room-settings');
        this.setupCreateRoomSettings();
    }

    showSinglePlayerSettings() {
        this.showScreen('single-player-settings');
        this.setupSinglePlayerSettings();
    }

    setupSinglePlayerSettings() {
        const difficultyBtns = document.querySelectorAll('.sp-difficulty-btn');
        difficultyBtns.forEach(btn => {
            btn.onclick = () => {
                difficultyBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                if (!document.querySelector('.sp-difficulty-btn.selected')) {
                    btn.classList.add('selected');
                }
            };
        });

        if (!document.querySelector('.sp-difficulty-btn.selected')) {
            difficultyBtns[0].classList.add('selected');
        }

        const backBtn = document.getElementById('sp-back-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                this.showScreen('menu');
            };
        }

        const startBtn = document.getElementById('sp-start-btn');
        if (startBtn) {
            const newBtn = startBtn.cloneNode(true);
            startBtn.parentNode.replaceChild(newBtn, startBtn);

            newBtn.onclick = async () => {
                const selectedDiffBtn = document.querySelector('.sp-difficulty-btn.selected');
                const difficulty = selectedDiffBtn ? selectedDiffBtn.dataset.value : 'mixed';
                const questionsInput = document.getElementById('sp-questions-input');
                const totalQuestions = questionsInput ? parseInt(questionsInput.value) || 10 : 10;

                newBtn.disabled = true;
                newBtn.textContent = 'Starting...';
                await game.startSinglePlayer(difficulty, totalQuestions);
                newBtn.disabled = false;
                newBtn.textContent = 'Start Game →';
            };
        }
    }

    setupCreateRoomSettings() {
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');
        difficultyBtns.forEach(btn => {
            btn.onclick = () => {
                difficultyBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            };
        });

        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            btn.onclick = () => {
                modeBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            };
        });

        const backBtn = document.getElementById('back-to-menu-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                this.showScreen('menu');
            };
        }

        const scoreInput = document.getElementById('score-limit-input');
        if (scoreInput) {
            scoreInput.addEventListener('change', () => {
                let val = parseInt(scoreInput.value);
                if (val !== 0 && val < 50) {
                    scoreInput.value = 50;
                }
            });
        }

        const confirmBtn = document.getElementById('confirm-create-room-btn');
        if (confirmBtn) {
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

            newBtn.onclick = async () => {
                const selectedDiffBtn = document.querySelector('.difficulty-btn.selected');
                const difficulty = selectedDiffBtn ? selectedDiffBtn.dataset.value : 'mixed';
                const selectedModeBtn = document.querySelector('.mode-btn.selected');
                const questionsMode = selectedModeBtn ? selectedModeBtn.dataset.value : 'same';
                const scoreInput = document.getElementById('score-limit-input');
                let scoreLimit = scoreInput ? parseInt(scoreInput.value) || 0 : 0;
                if (scoreLimit !== 0 && scoreLimit < 50) scoreLimit = 50;

                newBtn.disabled = true;
                const originalText = newBtn.textContent;
                newBtn.textContent = 'Creating...';
                await game.createRoom(difficulty, scoreLimit, questionsMode);
                newBtn.disabled = false;
                newBtn.textContent = originalText;
            };
        }
    }

    setupLobbyButtons() {
        const backBtn = document.getElementById('lobby-back-btn');
        if (backBtn) {
            const newBtn = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBtn, backBtn);

            newBtn.onclick = async () => {
                showNotification('Leaving lobby...', 'info');
                setTimeout(async () => {
                    await game.leaveRoom();
                }, 500);
            };
        }

        const copyBtn = document.getElementById('copy-link-btn');
        if (copyBtn) {
            const newBtn = copyBtn.cloneNode(true);
            copyBtn.parentNode.replaceChild(newBtn, copyBtn);

            newBtn.onclick = () => {
                const linkInput = document.getElementById('shareable-link');
                linkInput.select();
                document.execCommand('copy');
                showNotification('Link copied !', 'success');
            };
        }
    }

    showLobby(room, shareableLink, isHost) {
        this.showScreen('lobby');
        this.setupLobbyButtons();

        // *** FIX: Reset announced players when showing lobby ***
        this.announcedPlayers.clear();

        if (!isHost) {
            showNotification('Joining lobby...', 'info');
        }

        const linkInput = document.getElementById('shareable-link');
        linkInput.value = shareableLink;

        const startBtn = document.getElementById('start-game-btn');
        if (isHost) {
            startBtn.style.display = 'block';
            const newStartBtn = startBtn.cloneNode(true);
            startBtn.parentNode.replaceChild(newStartBtn, startBtn);
            newStartBtn.onclick = () => game.startGame();
        } else {
            startBtn.style.display = 'none';
        }

        this.loadPlayerList(room.id);
    }

    async loadPlayerList(roomId) {
        const result = await window.db.getSessionsByRoom(roomId);
        if (result.success) {
            this.updatePlayerList(result.sessions);
        }
    }

    updatePlayerList(sessions) {
        const container = document.getElementById('players-list');
        const currentSessionIds = new Set(sessions.map(s => s.id));

        if (!this.announcedPlayers) {
            this.announcedPlayers = new Set();
        }

        sessions.forEach((session, index) => {
            let playerDiv = document.getElementById(`player-session-${session.id}`);

            const isAuthenticated = session.discord_user_id !== null && session.discord_users;

            let displayName = session.player_discord_id;
            let avatarSrc = this.defaultAvatar;

            if (isAuthenticated) {
                displayName = session.discord_users.username;
                if (session.discord_users.avatar_url) {
                    avatarSrc = session.discord_users.avatar_url;
                }
            }

            const isHost = session.is_host;

            if (!playerDiv) {
                playerDiv = document.createElement('div');
                playerDiv.id = `player-session-${session.id}`;
                playerDiv.className = 'player-item player-join-animation';

                playerDiv.innerHTML = `
                    <div class="player-info" style="display: flex; align-items: center; width: 100%; overflow: hidden;">
                        <span class="player-number" style="margin-right: 10px; flex-shrink: 0;"></span>
                        <div class="player-identity" style="display: flex; align-items: center; flex-grow: 1; overflow: hidden;">
                            <img class="p-avatar" src="" alt="avatar" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; margin-right: 12px; border: 2px solid rgba(255,255,255,0.2); flex-shrink: 0;" onerror="this.src='${this.defaultAvatar}'">
                            <span class="p-name player-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; display: block;"></span>
                        </div>
                        <span class="host-badge-container"></span>
                    </div>
                    <div class="player-status" style="flex-shrink: 0;">
                        <span class="status-dot"></span>
                        Ready
                    </div>
                `;
                container.appendChild(playerDiv);

                container.appendChild(playerDiv);

                if (!this.announcedPlayers.has(session.id) && !isHost) {
                    const isAuth = session.discord_user_id !== null && session.discord_users;
                    const playerName = isAuth ? session.discord_users.username : session.player_discord_id;

                    if (sessions.length > 1) {
                        showNotification(`${playerName} joined!`, 'success');
                        if (typeof soundManager !== 'undefined') {
                            soundManager.playPlayerJoin();
                        }
                    }
                    this.announcedPlayers.add(session.id);
                }
            }

            playerDiv.querySelector('.player-number').textContent = `#${index + 1}`;
            playerDiv.querySelector('.p-name').textContent = displayName;

            const img = playerDiv.querySelector('.p-avatar');
            if (img.src !== avatarSrc) {
                img.src = avatarSrc;
            }

            const badgeContainer = playerDiv.querySelector('.host-badge-container');
            if (isHost && badgeContainer.innerHTML === '') {
                badgeContainer.innerHTML = '<span class="host-badge">HOST</span>';
            } else if (!isHost) {
                badgeContainer.innerHTML = '';
            }
        });

        Array.from(container.children).forEach(child => {
            const id = child.id.replace('player-session-', '');
            if (!currentSessionIds.has(Number(id)) && !currentSessionIds.has(id)) {
                child.remove();
                this.announcedPlayers.delete(Number(id));
                this.announcedPlayers.delete(id);
            }
        });

        const playerCount = sessions.length;
        document.getElementById('player-count').textContent = playerCount;
        this.lastPlayerCount = playerCount;
    }

    updateLiveLeaderboard(sessions, scoreLimit) {
        const liveHeader = document.getElementById('live-header-info');
        const qProgress = document.querySelector('.question-progress');

        if (scoreLimit > 0) {
            if (liveHeader) liveHeader.classList.remove('hidden');
            if (qProgress) qProgress.style.display = 'none';
            const targetVal = document.getElementById('target-score-val');
            if (targetVal) targetVal.textContent = scoreLimit;

            const sorted = [...sessions].sort((a, b) => b.total_score - a.total_score).slice(0, 1);
            const board = document.getElementById('live-leaderboard');
            if (board && sorted.length > 0) {
                const leader = sorted[0];
                const displayName = (leader.discord_users && leader.discord_users.username)
                    ? leader.discord_users.username
                    : leader.player_discord_id;
                const avatarUrl = (leader.discord_users && leader.discord_users.avatar_url)
                    ? leader.discord_users.avatar_url
                    : this.defaultAvatar;

                board.innerHTML = `
                    <div class="mini-player top-1">
                        <span class="leader-medal">🥇</span>
                        <img src="${avatarUrl}" alt="${displayName}" class="mini-avatar" onerror="this.src='${this.defaultAvatar}'">
                        <span class="leader-name">${displayName.substring(0, 12)}</span>
                        <span class="mini-score">${leader.total_score}</span>
                    </div>
                `;
            }
        } else {
            if (liveHeader) liveHeader.classList.add('hidden');
            if (qProgress) qProgress.style.display = 'block';
        }
    }

    showQuestion(question, currentNum, totalNum, scoreLimit = 0) {
        this.showScreen('question');

        if (typeof soundManager !== 'undefined') {
            soundManager.playNewQuestion();
        }

        const liveHeader = document.getElementById('live-header-info');
        const qProgress = document.querySelector('.question-progress');
        const playerScoreDisplay = document.getElementById('player-score-display');

        if (scoreLimit > 0) {
            if (liveHeader) liveHeader.classList.remove('hidden');
            if (qProgress) qProgress.style.display = 'none';
            if (playerScoreDisplay) {
                playerScoreDisplay.style.display = 'block';
                const playerScore = game.currentSession ? (game.currentSession.total_score || 0) : 0;
                const playerScoreValue = document.getElementById('player-score-value');
                if (playerScoreValue) playerScoreValue.textContent = playerScore;
            }
            const targetVal = document.getElementById('target-score-val');
            if (targetVal) targetVal.textContent = scoreLimit;
        } else {
            if (liveHeader) liveHeader.classList.add('hidden');
            if (qProgress) qProgress.style.display = 'block';
            if (playerScoreDisplay) playerScoreDisplay.style.display = 'none';
        }

        const questionNumberEl = document.getElementById('question-number');
        if (scoreLimit > 0) {
            questionNumberEl.textContent = `Target: ${scoreLimit} points`;
        } else {
            questionNumberEl.textContent = `Question ${currentNum}/${totalNum}`;
        }

        const progressBar = document.getElementById('progress-bar');
        const progressPercent = (currentNum / totalNum) * 100;
        progressBar.style.width = `${progressPercent}%`;

        document.getElementById('question-text').textContent = question.question_text;

        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';

        const options = [
            { key: 'a', text: question.option_a },
            { key: 'b', text: question.option_b },
            { key: 'c', text: question.option_c },
            { key: 'd', text: question.option_d }
        ];

        const shuffledOptions = this.shuffleArray([...options]);
        this.currentAnswerMapping = {};
        const reverseMapping = {};

        shuffledOptions.forEach((option, index) => {
            const displayKey = ['a', 'b', 'c', 'd'][index];
            this.currentAnswerMapping[displayKey] = option.key;
            reverseMapping[option.key] = displayKey;
        });

        this.currentCorrectDisplayKey = reverseMapping[question.correct_answer];

        shuffledOptions.forEach((option, index) => {
            const displayKey = ['a', 'b', 'c', 'd'][index];
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.dataset.key = displayKey;
            button.innerHTML = `
                <span class="option-letter">${displayKey.toUpperCase()}</span>
                <span class="option-text">${option.text}</span>
            `;

            button.onclick = () => {
                document.querySelectorAll('.option-btn').forEach(btn => {
                    btn.disabled = true;
                });
                button.classList.add('selected');
                game.submitAnswer(displayKey, question.correct_answer);
            };

            optionsContainer.appendChild(button);
        });
    }

    updateTimer(timeLeft) {
        const timerDisplay = document.getElementById('timer-display');
        const seconds = (Math.max(0, timeLeft) / 1000).toFixed(1);
        timerDisplay.textContent = seconds + 's';

        if (timeLeft <= 5000 && timeLeft > 0 && timeLeft % 1000 < 100) {
            if (typeof soundManager !== 'undefined') {
                soundManager.playWarningTick();
            }
        } else if (timeLeft % 1000 < 100 && timeLeft > 5000) {
            if (typeof soundManager !== 'undefined') {
                soundManager.playTick();
            }
        }

        if (timeLeft < 5000) {
            timerDisplay.style.color = '#ff4444';
        } else if (timeLeft < 10000) {
            timerDisplay.style.color = '#ffaa00';
        } else {
            timerDisplay.style.color = '#00ff88';
        }

        const timerBar = document.getElementById('timer-bar');
        const percent = (timeLeft / GAME_CONFIG.TIME_PER_QUESTION) * 100;
        timerBar.style.width = `${Math.max(0, percent)}%`;
    }

    showAnswerResult(isCorrect, points, correctDisplayKey, selectedDisplayKey) {
        const resultDiv = document.getElementById('answer-result');

        if (isCorrect) {
            if (typeof soundManager !== 'undefined') {
                soundManager.playCorrect();
            }
        } else {
            if (typeof soundManager !== 'undefined') {
                soundManager.playIncorrect();
            }
        }

        const allButtons = document.querySelectorAll('.option-btn');
        allButtons.forEach(btn => {
            const btnLetter = btn.querySelector('.option-letter').textContent.toLowerCase();

            if (btnLetter === correctDisplayKey.toLowerCase()) {
                btn.classList.add('correct');
            }
            if (!isCorrect && selectedDisplayKey && btnLetter === selectedDisplayKey.toLowerCase()) {
                btn.classList.add('incorrect');
            }
        });

        if (isCorrect) {
            resultDiv.innerHTML = `
                <div class="result-icon correct">✓</div>
                <div class="result-text">Correct!</div>
                <div class="result-points">+${points} points</div>
            `;
            resultDiv.className = 'answer-result correct';
        } else {
            resultDiv.innerHTML = `
                <div class="result-icon incorrect">✗</div>
                <div class="result-text">Incorrect</div>
                <div class="result-correct">Correct answer: ${correctDisplayKey.toUpperCase()}</div>
            `;
            resultDiv.className = 'answer-result incorrect';
        }

        resultDiv.style.display = 'flex';
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 2000);
    }

    async showFinalResults(sessions, currentPlayerId) {
        this.showScreen('results');
        if (typeof soundManager !== 'undefined') {
            soundManager.playGameEnd();
        }

        const leaderboard = document.getElementById('leaderboard');
        leaderboard.innerHTML = '<div class="loader-container"><div class="loader"></div><p>Calculating final stats...</p></div>';

        try {
            const statsPromises = sessions.map(async (session) => {
                const response = await db.getSessionStats(session.id);
                let discordUser = null;

                if (session.discord_user_id) {
                    const userResponse = await db.getDiscordUser(session.discord_user_id);
                    if (userResponse.success) {
                        discordUser = userResponse.user;
                    }
                }

                return {
                    ...session,
                    stats: response.success ? response.stats : { correct: 0, incorrect: 0 },
                    discordUser: discordUser
                };
            });

            const sessionsWithStats = await Promise.all(statsPromises);
            const sortedSessions = sessionsWithStats.sort((a, b) => b.total_score - a.total_score);

            leaderboard.innerHTML = '';

            sortedSessions.forEach((session, index) => {
                const isCurrentPlayer = session.player_discord_id === currentPlayerId;
                const rank = index + 1;
                let medal = '';
                if (rank === 1) medal = '🥇';
                else if (rank === 2) medal = '🥈';
                else if (rank === 3) medal = '🥉';

                const playerDiv = document.createElement('div');
                playerDiv.className = `leaderboard-item ${isCurrentPlayer ? 'current-player' : ''}`;

                let displayName = session.player_discord_id;
                let avatarSrc = this.defaultAvatar;

                const isAuthenticated = session.discord_user_id !== null && session.discord_users;
                if (isAuthenticated) {
                    displayName = session.discord_users.username;
                    if (session.discord_users.avatar_url) {
                        avatarSrc = session.discord_users.avatar_url;
                    }
                }

                const avatarHtml = `<img src="${avatarSrc}" alt="${displayName}" class="player-avatar" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-right: 15px;" onerror="this.src='${this.defaultAvatar}'">`;

                playerDiv.innerHTML = `
                    <div class="rank">${medal || `#${rank}`}</div>
                    <div class="player-info player-info-with-avatar">
                        ${avatarHtml}
                        <div>
                            <div class="player-name">${displayName}</div>
                            ${isCurrentPlayer ? '<div class="you-badge">YOU</div>' : ''}
                        </div>
                    </div>
                    <div class="player-stats">
                        <div class="stat correct" title="Correct Answers"><span class="stat-icon">✅</span><span class="stat-value">${session.stats.correct}</span></div>
                        <div class="stat incorrect" title="Incorrect Answers"><span class="stat-icon">❌</span><span class="stat-value">${session.stats.incorrect}</span></div>
                        <div class="total-score">${session.total_score} pts</div>
                    </div>
                `;
                leaderboard.appendChild(playerDiv);
            });
        } catch (error) {
            console.error('Error showing results:', error);
            leaderboard.innerHTML = '<p class="error-text">Error loading results. Please try refreshing.</p>';
        }

        const playAgainBtn = document.getElementById('play-again-btn');
        const newBtn = playAgainBtn.cloneNode(true);
        playAgainBtn.parentNode.replaceChild(newBtn, playAgainBtn);

        newBtn.onclick = () => {
            game.reset();
            this.showScreen('menu');
        };
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    initialize() {
        this.setupDiscordInput();
        this.setupMenu();
        this.addGlobalListeners();
    }

    addGlobalListeners() {
        document.addEventListener('click', (e) => {
            if ((e.target.tagName === 'BUTTON' || e.target.closest('button')) && typeof soundManager !== 'undefined') {
                soundManager.playClick();
            }
        });
        document.addEventListener('mouseover', (e) => {
            if ((e.target.tagName === 'BUTTON' || e.target.closest('button')) && typeof soundManager !== 'undefined') {
                soundManager.playHover();
            }
        });
    }
}

const ui = new UI();
window.addEventListener('DOMContentLoaded', () => { ui.initialize(); });
