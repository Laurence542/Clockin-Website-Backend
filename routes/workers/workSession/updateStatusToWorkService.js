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
 const VoiceChannel = require('../../../models/voiceChannel');
 const client = require('./bot'); 
 const router = express.Router();
 
 router.get('/update-status-to-work', authenticateUser, async (req, res) => {
  const discordId = req.user.userId;
  try {
    // Retrieve the user's selected guild.
    const selectedGuild = await SelectedGuild.findOne({ userId: discordId });
    if (!selectedGuild) {
      return res.status(400).json({ message: 'No selected guild found for this user.' });
    }
    const guildId = selectedGuild.guildId;
    const currentTime = new Date();


    // --- Check if user is in an allowed voice channel ---
    const voiceChannels = await VoiceChannel.find({ guildId });
    if (!voiceChannels || voiceChannels.length === 0) {
      return res.status(404).json({ message: 'No allowed voice channels found for this guild.' });
    }
    const allowedChannelIds = voiceChannels.map(vc => vc.channelId);
    
    // Use the Discord client to fetch the guild and member.
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).json({ message: 'The bot is not in the selected server.' });
    }
    const member = await guild.members.fetch(discordId);
    if (!member) {
      return res.status(404).json({ message: 'User not found in the guild.' });
    }
    const voiceState = member.voice;
    if (!voiceState.channel || !allowedChannelIds.includes(voiceState.channel.id)) {
      return res.status(400).json({ 
        message: 'You must be in an allowed voice channel to continue working.' 
      });
    }
    // --- End of voice channel check ---

    // Retrieve the worker document using the selected guild.
    const worker = await Worker.findOne({ guildId, userId: discordId });
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // If the worker is currently paused, calculate the break duration based on pauseStartTime.
    let breakDuration = 0;
    if (worker.isTimerPaused && worker.pauseStartTime) {
      breakDuration = currentTime.getTime() - new Date(worker.pauseStartTime).getTime();
    }

    // Update the worker document:
    // - Set status to "Work"
    // - Set isTimerPaused to false
    // - Increase accumulatedPauseDuration by the duration of the current break.
    const newAccumulatedPause = (worker.accumulatedPauseDuration || 0) + breakDuration;
    worker.status = "Work";
    worker.clockDates.breaks.breakEnd = currentTime;
    worker.isTimerPaused = false;
    worker.accumulatedPauseDuration = newAccumulatedPause;
    worker.pauseStartTime = null; // Clear the pause start time since we're resuming.
    await worker.save();


    return res.status(200).json({ 
      message: 'You have resume working',
      accumulatedPauseDuration: newAccumulatedPause,
      clockIn: worker.clockInTime,
      isTimerPaused: worker.isTimerPaused,
      pauseStart: null
    });
  } catch (error) {
    console.error('Error updating status to Work:', error);
    return res.status(500).json({ message: 'Failed to update status to Work. Please try again.' });
  }
});






router.get('/timer-details', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.user;
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(400).json({ message: 'No selected guild found for this user.' });
    }
    const guildId = selectedGuild.guildId;
    const worker = await Worker.findOne({ guildId, userId });
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found.' });
    }

    const currentTime = new Date();
    let elapsedSeconds = 0;
    if (worker.clockInTime) {
      const clockInTime = new Date(worker.clockInTime);
      // Use pause start if paused, otherwise current time:
      const effectiveTime = worker.isTimerPaused && worker.pauseStartTime
        ? new Date(worker.pauseStartTime)
        : currentTime;
      elapsedSeconds = Math.floor(
        (effectiveTime - clockInTime - (worker.accumulatedPauseDuration || 0)) / 1000
      );
    }
    // Calculate earned amount based on the worker's hourly rate.
    const earnedAmount = `€${((elapsedSeconds / 3600) * (worker.hourlyRate || 0)).toFixed(2)}`;

    // Return profileStatus along with timer details.
    res.status(200).json({
      clockInTime: worker.clockInTime,
      elapsedSeconds,
      earnedAmount,
      isPaused: worker.isTimerPaused,
      isClockedIn: Boolean(worker.clockInTime),
      status: worker.status, // Other status field if needed.
      profileStatus: worker.profileStatus // New field for frontend check.
    });
  } catch (error) {
    console.error("Error fetching timer details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});


 module.exports = router;
 