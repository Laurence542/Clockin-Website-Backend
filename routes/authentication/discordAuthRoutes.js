/*
 ------------------------------------------------------------------------------
 ------------------------------------------------------------------------------
 Copyright @ 2024 Segritude LTD.
 All right reserved.
 This code and all related assets are the property of segritude LTD.
 Unauthorized copying, distribution, or modification of this file, 
 via any medium, is strictly prohibited.

 NOTE: Tampering with or removing this notice is prohibited. 
 Any attempt to circumvent this restriction will be subject to legal action.

 ------------------------------------------------------------------------------
 ------------------------------------------------------------------------------
*/ 


const jwt = require('jsonwebtoken');
const express = require('express');
const axios = require('axios');
const Guild = require('../../models/guild.model');
const Worker = require('../../models/worker.model');
const router = express.Router();

router.get('/api/auth/discord', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.redirect(`${process.env.FRONTEND_URL}/callback?error=No+authorization+code+provided`);
    }

    try {
        // Step 1: Exchange code for access token
        const formData = new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: `${process.env.BACKEND_URL}/api/auth/discord`,
        });

        const tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token, refresh_token } = tokenResponse.data;

        // Step 2: Fetch user info
        const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: { 'Authorization': `Bearer ${access_token}` },
        });

        const user = userResponse.data;
        const avatarUrl = user.avatar 
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
        : null;

        // Step 3: Fetch user guilds
        const guildsResponse = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${access_token}` },
        });

        const userGuilds = guildsResponse.data;

        //  Generate JWT authToken
        const authToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        // Step 4: Store guilds and workers in DB
        for (const guild of userGuilds) {
            const { id: guildId, name: guildName, owner: isOwner, icon } = guild;

            // Create or update Guild
            await Guild.findOneAndUpdate(
                { guildId },
                {
                    guildId,
                    guildName,
                    guildImage: icon ? `https://cdn.discordapp.com/icons/${guildId}/${icon}.png` : null,
                    ownerId: isOwner ? user.id : undefined,
                },
                { upsert: true, new: true }
            );

            // Create or update Worker
            await Worker.findOneAndUpdate(
                { userId: user.id, guildId },
                {
                    userId: user.id,
                    guildId,
                    username: user.username,
                    email: user.email, 
                    avatar: avatarUrl,  
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    isOwner,
                },
                { upsert: true, new: true }
            );
        }

        // Set authToken as HTTP-Only cookie
        res.cookie('authToken', authToken, {
            httpOnly: true,      // Can't be accessed by JavaScript
            secure: process.env.NODE_ENV === 'production', // Only for HTTPS in production
            sameSite: 'Strict',  // Protect from CSRF
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        //  Redirect without exposing token
        return res.redirect(`${process.env.FRONTEND_URL}/callback?message=Authentication+successful`);

    } catch (error) {
        console.error('Error during Discord authentication:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Failed to authenticate with Discord.' });
    }
});

module.exports = router;
