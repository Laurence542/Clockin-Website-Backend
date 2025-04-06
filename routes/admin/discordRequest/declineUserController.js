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
const Worker = require('../../../models/worker.model');
const redis = require('../../../utils/redisClient');
const authenticateUser = require('../../../middleware/authMiddleware');
const router = express.Router();

router.post('/decline/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;  // ID of the user being declined
  const userId = req.user.userId;  // Current logged-in user

  try {
    // Get selected guild from Redis or database
    let selectedGuild = await redis.get(`user:${userId}:selectedGuild`);

    if (!selectedGuild) {
      const selectedGuildDoc = await SelectedGuild.findOne({ userId });
      if (!selectedGuildDoc) {
        return res.status(400).json({ error: 'Selected guild not set' });
      }
      selectedGuild = selectedGuildDoc.guildId;
      await redis.set(`user:${userId}:selectedGuild`, selectedGuild, { EX: 10800 });
    }

    // Update the profileStatus to 'Decline'
    const declinedWorker = await Worker.findOneAndUpdate(
      { guildId: selectedGuild, userId: id },
      { profileStatus: 'Decline' },
      { new: true }
    );

    if (!declinedWorker) {
      return res.status(404).json({ message: 'User not found in the selected guild' });
    }

    res.status(200).json({ message: 'User declined successfully', user: declinedWorker });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



module.exports = router;
