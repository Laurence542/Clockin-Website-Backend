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
const SelectedGuild = require('../../../models/selectedGuild');
const router = express.Router();


router.get('/update-status-to-break', authenticateUser, async (req, res) => {
  const discordId = req.user.userId;

  try {
    // Retrieve the user's selected guild.
    const selectedGuild = await SelectedGuild.findOne({ userId: discordId });
    if (!selectedGuild) {
      return res.status(400).json({ message: 'No selected guild found for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Record the current time as the break start time.
    const currentTime = new Date();

    // Update the worker document:
    // - Set status to "Break"
    // - Set isTimerPaused to true
    // - Set pauseStartTime to currentTime so the timer freezes immediately
    // - Push a new break record with breakStart time.
    const result = await Worker.findOneAndUpdate(
      { guildId, userId: discordId },
      { 
        $set: { status: "Break", isTimerPaused: true, pauseStartTime: currentTime },
        $push: { "clockDates.breaks": { breakStart: currentTime } },
        $inc: { breaksCount: 1 }
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: 'Failed to update status to Break. User not found in database.' });
    }

    return res.status(200).json({ 
      message: 'You are now on break.',
      breakStart: currentTime 
    });

  } catch (error) {
    console.error('Error updating status to Break:', error);
    return res.status(500).json({ message: 'Failed to update status to Break. Please try again.' });
  }
});

router.get('/timer-state', authenticateUser, async (req, res) => {
  const discordId = req.user.userId;
  try {
    const selectedGuild = await SelectedGuild.findOne({ userId: discordId });
    if (!selectedGuild) {
      return res.status(400).json({ message: 'No selected guild found for this user.' });
    }
    const guildId = selectedGuild.guildId;
    const worker = await Worker.findOne({ guildId, userId: discordId });
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found.' });
    }
    return res.status(200).json({
      clockIn: worker.clockInTime,         
      isTimerPaused: worker.isTimerPaused,    
      pauseStart: worker.pauseStartTime,     
      accumulatedPauseDuration: worker.accumulatedPauseDuration 
    });
  } catch (error) {
    console.error('Error retrieving timer state:', error);
    return res.status(500).json({ message: 'Failed to retrieve timer state. Please try again.' });
  }
});

module.exports = router;
