const SUPABASE_CONFIG = {
    URL: 'https://tubttdijbocrniuutdiz.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1YnR0ZGlqYm9jcm5pdXV0ZGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTQxODAsImV4cCI6MjA4MDU5MDE4MH0.FkAZAKxtZiO1HiJZADGVHTqs4TwDjtnrv3NTd4Stf4I'
};

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY) : null;

const GAME_CONFIG = {
    TOTAL_QUESTIONS: 20,
    TIME_PER_QUESTION: 15000,
    BASE_POINTS: 10,
    MAX_SPEED_BONUS: 5,
    ROOM_CODE_LENGTH: 6
};

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const DISCORD_CONFIG = {
    CLIENT_ID: '1447666119639830629',
    REDIRECT_URI: isLocalhost
        ? 'http://localhost:3000'
        : 'https://stork-quiz-game.vercel.app'
};

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < GAME_CONFIG.ROOM_CODE_LENGTH; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function calculateScore(isCorrect, timeTaken) {
    if (!isCorrect) return 0;

    const timeRemaining = GAME_CONFIG.TIME_PER_QUESTION - timeTaken;
    const speedBonus = Math.floor((timeRemaining / GAME_CONFIG.TIME_PER_QUESTION) * GAME_CONFIG.MAX_SPEED_BONUS);

    return GAME_CONFIG.BASE_POINTS + Math.max(0, speedBonus);
}

function getRoomCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
}

function generateShareableLink(roomCode) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?room=${roomCode}`;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function formatTime(ms) {
    return (ms / 1000).toFixed(1) + 's';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
