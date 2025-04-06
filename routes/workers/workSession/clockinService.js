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
 const GuildWorkers = require('../../../models/worker.model'); 
 const Task = require('../../../models/task');
 const SelectedGuild = require('../../../models/selectedGuild');
 const VoiceChannel = require('../../../models/voiceChannel');
 const Worker = require('../../../models/worker.model');
 const client = require('./bot');
 const router = express.Router();
 
 router.get('/clockin', authenticateUser, async (req, res) => {
  const discordId = req.user.userId;

  // Retrieve the user's selected guild
  const selectedGuild = await SelectedGuild.findOne({ userId: req.user.userId });
  if (!selectedGuild) {
    return res.status(400).json({ message: 'No selected guild found for this user.' });
  }
  const guildId = selectedGuild.guildId;

  try {
    // Fetch allowed voice channels for this guild.
    const voiceChannelData = await VoiceChannel.find({ guildId });
    if (!voiceChannelData || voiceChannelData.length === 0) {
      return res.status(404).json({ 
        message: 'No voice channels found for this server. Add voice channel information under settings' 
      });
    }

    // Build an array of allowed channel IDs.
    const allowedChannelIds = voiceChannelData.map(vc => vc.channelId);

    // Fetch the guild from Discord.
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).json({ message: 'The bot is not in the selected server.' });
    }

    // Fetch the member from Discord.
    const member = await guild.members.fetch(discordId);
    if (!member) {
      return res.status(404).json({ message: 'User not found in the guild.' });
    }

    const voiceState = member.voice;
    if (!voiceState.channel) {
      return res.status(400).json({ message: 'You are not connected to any voice channel.' });
    }

    // Check if the user is in one of the allowed voice channels.
    if (!allowedChannelIds.includes(voiceState.channel.id)) {
      return res.status(400).json({ message: 'You must be in an allowed voice channel to clock in.' });
    }

    // Ensure the user has a task in progress.
    const userTasks = await Task.find({ guildId, userId: discordId, status: { $in: ['In Progress', 'Start'] } });
    if (!userTasks || userTasks.length === 0) {
      return res.status(400).json({ message: 'You need to start or open a task in the task section before clocking in.' });
    }

    // Update the worker's status to "Work" and record the clock-in time.
    const currentTime = new Date();
    const result = await Worker.findOneAndUpdate(
      { guildId, userId: discordId },
      { 
        $set: { 
          status: "Work", 
          clockInTime: currentTime,
          accumulatedPauseDuration: 0,
          pauseStartTime: null
        }
      },
      { new: true }
    );


    if (!result) {
      return res.status(404).json({ message: 'Failed to update status. Worker not found in database.' });
    }

    return res.status(200).json({ message: 'You have clocked in successfully.', clockInTime: currentTime });
  } catch (error) {
    console.error('Error in /clockin:', error);
    if (error.code === 10004) {
      return res.status(404).json({ message: 'The bot is not in the selected server. Please check your server ID.' });
    }
    return res.status(500).json({ message: 'Failed to check voice state. Please try again.' });
  }
});
 


// Get workers for a specific guild
router.get('/workers', authenticateUser, async (req, res) => {
    try {
        // Get user ID from the JWT middleware (ensure token includes userId)
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
        }

        // Find the selected guild for the authenticated user
        const userGuild = await SelectedGuild.findOne({ userId });
        if (!userGuild) {
            return res.status(404).json({ error: 'No guild selected for this user.' });
        }

        const guildId = userGuild.guildId;

        // Find active workers for this guild using the Worker model
        const workers = await Worker.find({ guildId, profileStatus: "Active" });

        if (!workers || workers.length === 0) {
            return res.status(404).json({ error: 'No active workers found for this guild.' });
        }

        res.json({ workers });
    } catch (error) {
        console.error('Error fetching workers:', error);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});



router.get('/worker-status', authenticateUser, async (req, res) => {
  const discordId = req.user.userId;
  const guildId = req.headers['x-selected-guild'];

  if (!guildId) {
      return res.status(400).json({ message: 'Guild ID is required.' });
  }

  try {
      const guild = await client.guilds.fetch(guildId);
      if (!guild) {
          return res.status(404).json({ message: 'The bot is not in the selected server.' });
      }

      const worker = await GuildWorkers.findOne({ guildId, "workers.userId": discordId });
      if (!worker) {
          return res.status(404).json({ message: 'Worker not found in the database.' });
      }

      const status = worker.workers.find(w => w.userId === discordId).status;
      return res.status(200).json({ status });
  } catch (error) {
      console.error('Error fetching worker status:', error);
      return res.status(500).json({ message: 'Failed to fetch worker status.' });
  }
});



router.get('/check-voice-channel', authenticateUser, async (req, res) => {
  const discordId = req.user.userId;
  try {
    // Retrieve the user's selected guild from the SelectedGuild collection.
    const selectedGuild = await SelectedGuild.findOne({ userId: discordId });
    if (!selectedGuild) {
      return res.status(400).json({ message: 'No selected guild found for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Fetch allowed voice channels for the guild.
    // Use find() because each allowed channel is stored in its own document.
    const voiceChannelData = await VoiceChannel.find({ guildId });
    if (!voiceChannelData || voiceChannelData.length === 0) {
      return res.status(404).json({ message: 'No allowed voice channels found for this guild.' });
    }
    // Build an array of allowed channel IDs.
    const allowedChannelIds = voiceChannelData.map(vc => vc.channelId);

    // Fetch the guild via your Discord client.
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).json({ message: 'The bot is not in the selected server.' });
    }

    // Fetch the member from Discord.
    const member = await guild.members.fetch(discordId);
    if (!member) {
      return res.status(404).json({ message: 'User not found in the guild.' });
    }

    // Check the member's current voice state.
    const voiceState = member.voice;
    if (!voiceState.channel || !allowedChannelIds.includes(voiceState.channel.id)) {
      return res.status(400).json({ 
        message: 'You must be in an allowed voice channel to continue working.', 
        inVoiceChannel: false 
      });
    }

    return res.status(200).json({ message: 'You are in an allowed voice channel.', inVoiceChannel: true });
  } catch (error) {
    console.error('Error checking voice channel:', error);
    return res.status(500).json({ message: 'Failed to check voice channel. Please try again.' });
  }
});



router.post('/ticket', authenticateUser, async (req, res) => {
    try {
      const { headline, description, dueDate, priority, status } = req.body;
  
      // Validate all required fields are provided
      if (!headline || !description || !dueDate || !priority || !status) {
        return res.status(400).json({ error: 'All fields are required.' });
      }
  
      // Retrieve the user's selected guild from the selectedGuild collection
      const selectedGuild = await SelectedGuild.findOne({ userId: req.user.userId });
      if (!selectedGuild) {
        return res.status(400).json({ error: 'No selected guild found for this user.' });
      }
      const guildId = selectedGuild.guildId;
  
      // Create a new task document using the authenticated user's ID and the selected guildId
      const newTask = new Task({
        guildId,
        userId: req.user.userId,
        createdBy: req.user.userId, // Or modify if needed
        headline,
        description,
        dueDate,
        priority,
        status,
      });
  
      await newTask.save();
  
      res.status(201).json({ message: 'Task created successfully.' });
    } catch (error) {
      console.error('Error creating task:', error.message);
      res.status(500).json({ error: 'An error occurred while creating the task.' });
    }
  });



  router.get('/clockintime', authenticateUser, async (req, res) => {
    try {
      const { userId } = req.user;
      const selectedGuild = await SelectedGuild.findOne({ userId });
      if (!selectedGuild) {
        return res.status(400).json({ error: 'No selected guild found for this user.' });
      }
      const guildId = selectedGuild.guildId;
      const worker = await Worker.findOne({ guildId, userId });
      if (!worker || !worker.clockInTime) {
        return res.status(404).json({ error: 'Clock in time not found' });
      }
      // Return the clockInTime as a timestamp (in milliseconds)
      res.json({ clockIn: new Date(worker.clockInTime).getTime() });
    } catch (error) {
      console.error('Error fetching clock in time:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  


module.exports = router;