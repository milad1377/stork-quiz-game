const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '.')));

app.post('/api/auth/discord', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.DISCORD_REDIRECT_URI
        });

        const response = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Discord Auth Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Authentication failed',
            details: error.response?.data || error.message
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Ensure you have added http://localhost:3000 to your Discord Redirect URIs');
});
