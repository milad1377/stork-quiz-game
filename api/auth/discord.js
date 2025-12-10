const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

        const response = await axios.post(
            'https://discord.com/api/oauth2/token',
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Discord Auth Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Authentication failed',
            details: error.response?.data || error.message
        });
    }
};
