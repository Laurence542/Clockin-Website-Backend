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


require('dotenv').config();
const express = require('express');
const axios = require('axios');
const url = require('url');
const GuildWorkers = require('../models/worker'); 
const Guild = require('../models/guild.model');
const Worker = require('../models/worker.model');
const jwt = require('jsonwebtoken');
const authenticateUser = require('../middleware/authMiddleware');
const redis = require('../utils/redisClient');
const SelectedGuild = require('../models/selectedGuild');
const client = require('../routes/workers/workSession/bot');
const router = express.Router();



router.get('/api/user/guilds', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Check if cached guilds exist
        const cachedGuilds = await redis.get(`user:${userId}:guilds`);
        const cachedSelectedGuild = await redis.get(`user:${userId}:selectedGuild`);

        if (cachedGuilds && cachedSelectedGuild) {
            console.log('Cache hit: Returning data from Redis');
            return res.json({
                guilds: JSON.parse(cachedGuilds),
                selectedGuild: cachedSelectedGuild
            });
        }

        console.log('Cache miss: Fetching from database');
        const workers = await Worker.find({ userId }).exec();
        const guilds = await Promise.all(
            workers.map(async (worker) => {
                const guild = await Guild.findOne({ guildId: worker.guildId });
                if (guild) {
                    return {
                        id: guild.guildId,
                        name: guild.guildName,
                        icon: guild.guildImage,
                        isOwner: worker.isOwner
                    };
                }
                return null;
            })
        );

        const filteredGuilds = guilds.filter((guild) => guild !== null);

        // Cache guilds and selected guild
        await redis.set(`user:${userId}:guilds`, JSON.stringify(filteredGuilds), { EX: 10800 }); // 3 hours
        const selectedGuild = await SelectedGuild.findOne({ userId });
        if (selectedGuild) {
            await redis.set(`user:${userId}:selectedGuild`, selectedGuild.guildId, { EX: 10800 });
        }

        res.json({
            guilds: filteredGuilds,
            selectedGuild: selectedGuild?.guildId || null
        });
    } catch (error) {
        console.error('Failed to fetch user guilds:', error.message);
        res.status(500).json({ error: 'Failed to retrieve user guilds.' });
    }
});



router.post('/api/user/select-guild', authenticateUser, async (req, res) => {
    const { guildId } = req.body;
    const userId = req.user.userId;

    if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required.' });
    }

    try {
        // Verify the provided guild exists
        const guild = await Guild.findOne({ guildId });
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found.' });
        }

        // Fetch the user's current selected guild before updating
        const currentSelection = await SelectedGuild.findOne({ userId });

        // Upsert: update or create the SelectedGuild document
        const updatedSelection = await SelectedGuild.findOneAndUpdate(
            { userId },
            { guildId },
            { new: true, upsert: true }
        );

        // Cache the selected guild for 3 hours
        await redis.set(`user:${userId}:selectedGuild`, guildId, { EX: 10800 });

        // If there was a previous selection and it differs from the new guild,
        // then check if the user was working in the old guild and pause their timer.
        if (currentSelection && currentSelection.guildId !== guildId) {
            // Find the worker record for the old guild
            const worker = await Worker.findOne({ userId, guildId: currentSelection.guildId });
            // Only update if the worker was actively working
            if (worker && worker.status === "Work") {
                const currentTime = new Date();
                worker.status = "Break";
                worker.isTimerPaused = true;
                worker.pauseStartTime = currentTime;
                worker.breaksCount += 1;
                // Ensure clockDates.breaks exists
                if (!worker.clockDates || !Array.isArray(worker.clockDates.breaks)) {
                    worker.clockDates = { clockIn: [], clockOut: [], breaks: [] };
                }
                worker.clockDates.breaks.push({ breakStart: currentTime });
                await worker.save();
                console.log(`Worker ${userId} automatically paused because they changed their working guild from ${currentSelection.guildId} to ${guildId}.`);

                // Send DM to the user informing them of the auto-pause
                try {
                    const user = await client.users.fetch(userId);
                    await user.send(`I automatically paused you since you left your working server.`);
                } catch (dmError) {
                    console.error(`Failed to send DM to user ${userId} about the pause:`, dmError);
                }
            }
        }

        res.json({
            message: 'Selected guild updated successfully.',
            selectedGuild: updatedSelection.guildId
        });
    } catch (error) {
        console.error('Failed to update selected guild:', error.message);
        res.status(500).json({ error: 'Failed to update selected guild.' });
    }
});


module.exports = router;
