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
 
 // Fetch weekly earnings for the authenticated user based on their selected guild
 router.get('/earnings/week', authenticateUser, async (req, res) => {
   try {
     // Retrieve the user's selected guild from the SelectedGuild collection
     const selectedGuild = await SelectedGuild.findOne({ userId: req.user.userId });
     if (!selectedGuild) {
       return res.status(400).json({ error: 'No selected guild found for this user.' });
     }
     const guildId = selectedGuild.guildId;
 
     // Determine the start of the week (Monday 00:00:00)
     const now = new Date();
     const dayOfWeek = now.getDay(); 
     const diffToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); 
     const startOfWeek = new Date(now);
     startOfWeek.setDate(now.getDate() - diffToMonday);
     startOfWeek.setHours(0, 0, 0, 0);
 
     // Retrieve all work sessions for the user in their selected guild starting from the beginning of the week
     const workSessions = await WorkSession.find({
       userId: req.user.userId,
       guildId: guildId,
       clockInTime: { $gte: startOfWeek },
     });
 
     // Initialize an array for the 7 days of the week (Monday as index 0)
     let weeklyEarnings = Array(7).fill(0);
 
     // Sum earnings for each day based on clockInTime
     workSessions.forEach(session => {
       const sessionDate = new Date(session.clockInTime);
       // Convert getDay() so that Monday=0, Tuesday=1, ..., Sunday=6.
       const dayIndex = (sessionDate.getDay() + 6) % 7;
       weeklyEarnings[dayIndex] += session.totalEarnings;
     });
 
     console.log("Weekly Earnings Data:", weeklyEarnings);
     res.status(200).json({ weeklyEarnings });
   } catch (error) {
     console.error('Error fetching weekly earnings:', error);
     res.status(500).json({ error: 'Failed to fetch weekly earnings' });
   }
 });
 
 module.exports = router;
 