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

router.get('/time-off-requests/user', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId; // Extracted from your authentication middleware
        const selectedGuild = await SelectedGuild.findOne({ userId }); // Find guild based on user
        
        if (!selectedGuild) {
            return res.status(400).json({ error: 'No selected guild found for this user.' });
        }

        const guildId = selectedGuild.guildId;

        // Fetch all time-off requests for the user within their selected guild
        const requests = await TimeOffRequest.find({ userId, guildId }).sort({ submittedAt: -1 });

        if (!requests.length) {
            return res.status(404).json({ error: 'No time-off requests found for the user.' });
        }

        res.status(200).json(requests);
    } catch (error) {
        console.error('Error fetching time-off requests:', error.message);
        res.status(500).json({ error: 'Failed to fetch time-off requests' });
    }
});


module.exports = router;
