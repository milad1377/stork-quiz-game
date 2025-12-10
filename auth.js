
class DiscordAuth {
    constructor() {
        this.clientId = DISCORD_CONFIG.CLIENT_ID;
        this.redirectUri = DISCORD_CONFIG.REDIRECT_URI;
        this.scopes = ['identify'];
        this.currentUser = null;
    }

    getAuthUrl() {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: this.scopes.join(' ')
        });

        return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    }

    login() {
        const authUrl = this.getAuthUrl();
        window.location.href = authUrl;
    }

    async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (!code) {
            showNotification('No authorization code found', 'error');
            return null;
        }

        try {
            const tokenData = await this.exchangeCode(code);

            if (!tokenData || !tokenData.access_token) {
                throw new Error('Failed to get access token');
            }

            const userData = await this.getUserInfo(tokenData.access_token);

            if (!userData) {
                throw new Error('Failed to get user info');
            }

            const result = await window.db.createOrUpdateDiscordUser(userData);

            if (result.success) {
                this.currentUser = userData;
                localStorage.setItem('discord_user', JSON.stringify(userData));
                showNotification(`Welcome, ${userData.username}!`, 'success');
                return userData;
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('OAuth callback error:', error);
            showNotification('Login failed: ' + error.message, 'error');
            return null;
        }
    }

    async exchangeCode(code) {
        try {
            const response = await fetch('/api/auth/discord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Token exchange failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Token exchange error:', error);
            showNotification('Authentication server error', 'error');
            return null;
        }
    }

    async getUserInfo(accessToken) {
        try {
            const response = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }

            const data = await response.json();

            let avatarUrl;

            if (data.avatar) {
                const format = data.avatar.startsWith('a_') ? 'gif' : 'png';
                avatarUrl = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${format}`;
            } else {
                if (data.discriminator === '0') {
                    const index = (BigInt(data.id) >> 22n) % 6n;
                    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
                } else {
                    const index = parseInt(data.discriminator) % 5;
                    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
                }
            }

            return {
                discord_id: data.id,
                username: data.username,
                discriminator: data.discriminator,
                avatar_url: avatarUrl
            };
        } catch (error) {
            console.error('Get user info error:', error);
            return null;
        }
    }

    isLoggedIn() {
        if (this.currentUser) return true;

        const stored = localStorage.getItem('discord_user');
        if (stored) {
            try {
                this.currentUser = JSON.parse(stored);
                return true;
            } catch (e) {
                localStorage.removeItem('discord_user');
            }
        }

        return false;
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const stored = localStorage.getItem('discord_user');
            if (stored) {
                try {
                    this.currentUser = JSON.parse(stored);
                } catch (e) {
                    localStorage.removeItem('discord_user');
                }
            }
        }
        return this.currentUser;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('discord_user');
        showNotification('Logged out successfully', 'info');
    }
}

window.discordAuth = new DiscordAuth();
