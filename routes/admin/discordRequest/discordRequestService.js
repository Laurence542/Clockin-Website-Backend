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
const SelectedGuild = require('../../../models/selectedGuild');
const authenticateUser = require('../../../middleware/authMiddleware');
const redis = require('../../../utils/redisClient');
const router = express.Router();

router.get('/users', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Try to get the selected guild from Redis
    let selectedGuild = await redis.get(`user:${userId}:selectedGuild`);
    if (!selectedGuild) {
      const selectedGuildDoc = await SelectedGuild.findOne({ userId });
      if (!selectedGuildDoc) {
        return res.status(400).json({ error: 'Selected guild not set' });
      }
      selectedGuild = selectedGuildDoc.guildId;
      // Cache it for 3 hours
      await redis.set(`user:${userId}:selectedGuild`, selectedGuild, { EX: 10800 });
    }
    
    // Determine the filter status; default to 'Inactive'
    const filterStatus = req.query.status;
    const validStatuses = ['Inactive', 'Decline'];
    const statusFilter = validStatuses.includes(filterStatus) ? filterStatus : 'Inactive';
    
    // Query workers by the specified status
    const guildUsers = await Worker.find({
      guildId: selectedGuild,
      userId: { $ne: userId },
      profileStatus: statusFilter
    });
    
    // Format the users for the frontend
    const formattedUsers = guildUsers.map(user => ({
      id: user.userId,
      name: user.username || 'N/A',
      email: user.email || 'N/A',
      profilePicture: user.avatar || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png',
      registrationDate: user.createdAt ? user.createdAt.toISOString() : 'N/A'
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
