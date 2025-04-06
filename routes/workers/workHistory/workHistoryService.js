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

const express = require('express');
const WorkSession = require('../../../models/workSession'); 
const SelectedGuild = require('../../../models/selectedGuild');
const authenticateUser = require('../../../middleware/authMiddleware');
const router = express.Router();

router.get('/work-history', authenticateUser, async (req, res) => {
    try {
        const { startDate, endDate, minEarnings, maxEarnings, keyword } = req.query;

        // Fetch selected guildId for authenticated user
        const selectedGuild = await SelectedGuild.findOne({ userId: req.user.userId });

        if (!selectedGuild) {
            return res.status(400).json({ error: 'No selected guild found for this user.' });
        }

        const guildId = selectedGuild.guildId;

        // Query filter
        const filter = {
            guildId: guildId,
            userId: req.user.userId, 
        };

        if (startDate && endDate) {
            filter.clockInTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (minEarnings) {
            filter.totalEarnings = { ...filter.totalEarnings, $gte: Number(minEarnings) };
        }
        if (maxEarnings) {
            filter.totalEarnings = { ...filter.totalEarnings, $lte: Number(maxEarnings) };
        }
        if (keyword) {
            filter.workDescription = { $regex: keyword, $options: 'i' };
        }

        const workSessions = await WorkSession.find(filter).sort({ clockOutTime: -1 });

        if (!workSessions.length) {
            return res.status(404).json({ message: 'No work history found with the given filters.' });
        }

        res.status(200).json(workSessions);

    } catch (error) {
        console.error('Error fetching work history:', error);
        res.status(500).json({ error: 'Failed to fetch work history' });
    }
});

module.exports = router;
