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
const TimeOffRequest = require('../../../models/timeOffRequest');
const SelectedGuild = require('../../../models/selectedGuild');
const authenticateUser = require('../../../middleware/authMiddleware');
const router = express.Router();

router.post('/time-off-requests', authenticateUser, async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.body;
        const userId = req.user.userId; // Get userId from token

        if (!startDate || !endDate || !reason) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Fetch the selected guild for the user
        const selectedGuild = await SelectedGuild.findOne({ userId });
        if (!selectedGuild) {
            return res.status(400).json({ error: 'No selected guild found. Please select a guild.' });
        }
        const guildId = selectedGuild.guildId; // Get guildId from DB

        // Save request as a new document
        const newRequest = new TimeOffRequest({
            guildId,
            userId,
            startDate,
            endDate,
            reason,
            status: 'pending', // Default status
        });

        await newRequest.save();

        res.status(201).json({ message: 'Time-off request submitted successfully' });

    } catch (error) {
        console.error('Error saving time-off request:', error.message);
        res.status(500).json({ error: 'Failed to submit time-off request' });
    }
});

module.exports = router;


