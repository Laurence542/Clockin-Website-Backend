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
const authenticateUser = require('../../../middleware/authMiddleware');
const WorkSession = require('../../../models/workSession');
const SelectedGuild = require('../../../models/selectedGuild');
const router = express.Router();

// Fetch monthly earnings for the authenticated user based on their selected guild
router.get('/earnings/month', authenticateUser, async (req, res) => {
    try {
        // Look up the user's selected guild from the SelectedGuild collection
        const selectedGuild = await SelectedGuild.findOne({ userId: req.user.userId });
        if (!selectedGuild) {
            return res.status(400).json({ error: 'No selected guild found for this user.' });
        }
        const guildId = selectedGuild.guildId;

        // Retrieve all work sessions for the user in their selected guild
        const workSessions = await WorkSession.find({
            userId: req.user.userId,
            guildId: guildId,
        });

        // Initialize an array of 12 months (January = index 0, December = index 11)
        let monthlyEarnings = Array(12).fill(0);

        // Aggregate earnings based on the session's clockInTime
        workSessions.forEach(session => {
            const sessionDate = new Date(session.clockInTime);
            const monthIndex = sessionDate.getMonth(); // 0 = January, 11 = December
            monthlyEarnings[monthIndex] += session.totalEarnings;
        });

        console.log("Monthly Earnings Data:", monthlyEarnings);

        res.status(200).json({ monthlyEarnings });
    } catch (error) {
        console.error('Error fetching monthly earnings:', error);
        res.status(500).json({ error: 'Failed to fetch monthly earnings' });
    }
});

module.exports = router;
