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
const Worker = require('../../../models/worker.model');
const Guild = require('../../../models/guild.model');
const SelectedGuild = require("../../../models/selectedGuild");
const router = express.Router();


router.get("/user", authenticateUser, async (req, res) => {
    try {
      const { userId } = req.user;
  
      //  Fetch the selected guild ID for the authenticated user
      const selectedGuild = await SelectedGuild.findOne({ userId });
      if (!selectedGuild) {
        return res.status(400).json({ error: "No selected guild found." });
      }
  
      // Query the Worker collection for the user's record in the selected guild
      const worker = await Worker.findOne({
        userId,
        guildId: selectedGuild.guildId,
      });
      if (!worker) {
        return res.status(404).json({ error: "User not found in the selected guild." });
      }
  
      const guild = await Guild.findOne({ guildId: selectedGuild.guildId });
      if (!guild) {
        return res.status(404).json({ error: "Guild not found." });
      }
  
      //  Return the user profile along with the guild name
      res.json({
        ...worker.toObject(),
        guildName: guild.guildName,
      });
    } catch (error) {
      console.error("Error fetching user details:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });



  router.get('/hourlyrateearnings', authenticateUser, async (req, res) => {
    try {
      const { userId } = req.user;
      const selectedGuild = await SelectedGuild.findOne({ userId });
      if (!selectedGuild) {
        return res.status(400).json({ error: 'No selected guild found for this user.' });
      }
      const guildId = selectedGuild.guildId;
      const worker = await Worker.findOne({ guildId, userId });
  
      if (!worker) {
        return res.status(404).json({ error: 'Worker not found in the selected guild.' });
      }
  
      const hourlyRate = worker.hourlyRate ? parseFloat(worker.hourlyRate) : 0;
      res.json({ hourlyRate });
    } catch (error) {
      console.error('Error fetching hourly rate:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

module.exports = router;
