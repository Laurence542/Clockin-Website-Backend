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

router.get('/earnings', authenticateUser, async (req, res) => {
    try {
      // Retrieve the authenticated user's selected guild from the SelectedGuild collection
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
  
      // Define time boundaries (using server local time; adjust for time zones if needed)
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(todayStart.getDate() - 1);
  
      let todayEarnings = 0;
      let yesterdayEarnings = 0;
      let totalEarnings = 0;
  
      // Iterate over each work session and aggregate earnings
      workSessions.forEach(session => {
        // Use clockInTime as the session's date (change to clockOutTime if desired)
        const sessionDate = new Date(session.clockInTime);
        const earnings = session.totalEarnings; // Already a Number per your schema
  
        // Sum earnings based on when the session started
        if (sessionDate >= todayStart) {
          todayEarnings += earnings;
        } else if (sessionDate >= yesterdayStart && sessionDate < todayStart) {
          yesterdayEarnings += earnings;
        }
        totalEarnings += earnings;
      });
  
      res.status(200).json({
        today: todayEarnings,
        yesterday: yesterdayEarnings,
        totalRevenue: totalEarnings
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
      res.status(500).json({ error: 'Failed to fetch earnings' });
    }
  });
  


module.exports = router;