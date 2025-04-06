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

const { Client, GatewayIntentBits } = require('discord.js');
const Worker = require('../../../models/worker.model');
const VoiceChannel = require('../../../models/voiceChannel');
const SelectedGuild = require('../../../models/selectedGuild');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    // Identify the user.
    const userId = newState.member.user.id;
    const currentTime = new Date();

    // Get the user's selected guild.
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      console.log(`No selected guild found for user ${userId}`);
      return;
    }
    const guildId = selectedGuild.guildId;

    // Fetch allowed voice channels for this guild.
    const voiceChannels = await VoiceChannel.find({ guildId });
    if (!voiceChannels || voiceChannels.length === 0) {
      console.log(`No allowed voice channels found for guild ${guildId}`);
      return;
    }
    const allowedChannelIds = voiceChannels.map(vc => vc.channelId);

    // Determine the old and new channel IDs.
    const oldChannelId = oldState.channel ? oldState.channel.id : null;
    const newChannelId = newState.channel ? newState.channel.id : null;

    // Look up the worker record for this user in the selected guild.
    let worker = await Worker.findOne({ guildId, userId });
    if (!worker) {
      // If not found, create a new Worker record with default values.
      worker = new Worker({
        guildId,
        userId,
        status: "Work", // Assume default state is working.
        clockDates: { breaks: [] },
        isTimerPaused: false,
        accumulatedPauseDuration: 0,
      });
      await worker.save();
      console.log(`Created new Worker record for user ${userId} in guild ${guildId}`);
    }

    // --- Automatic Pause ---
    // Only proceed if the user is currently "Working" (i.e. not Offline) and not already paused.
    if (
      worker.status === "Work" &&
      oldChannelId &&
      allowedChannelIds.includes(oldChannelId) &&
      (!newChannelId || (newChannelId && !allowedChannelIds.includes(newChannelId))) &&
      !worker.isTimerPaused
    ) {
      worker.status = "Break";
      worker.isTimerPaused = true;
      worker.pauseStartTime = currentTime;
      worker.breaksCount = (worker.breaksCount || 0) + 1;

      // Ensure clockDates exists and clockDates.breaks is an array.
      if (!worker.clockDates || !Array.isArray(worker.clockDates.breaks)) {
        worker.clockDates = {
          clockIn: worker.clockDates && worker.clockDates.clockIn ? worker.clockDates.clockIn : [],
          clockOut: worker.clockDates && worker.clockDates.clockOut ? worker.clockDates.clockOut : [],
          breaks: []
        };
      }
      // Append a new break record.
      worker.clockDates.breaks.push({ breakStart: currentTime });
      await worker.save();

      console.log(`Worker ${userId} automatically set to Break (left allowed channel).`);

      // Send a creative, dark-themed DM about the automatic pause.
      try {
        const user = await client.users.fetch(userId);
        await user.send(
           `I automatically put you on break since you left the working channel. You can jump back in anytime, and I will automatically resume your work`
        );
      } catch (dmError) {
        console.error(`Failed to send DM to user ${userId} on pause:`, dmError);
      }
    }

    // --- Automatic Resume ---
    // Only proceed if the user is currently on "Break" (i.e. not Offline) and is paused.
    if (
      worker.status === "Break" &&
      newChannelId &&
      allowedChannelIds.includes(newChannelId) &&
      (!oldChannelId || (oldChannelId && !allowedChannelIds.includes(oldChannelId))) &&
      worker.isTimerPaused
    ) {
      // Update the last break record (if one exists without a breakEnd).
      if (worker.clockDates && Array.isArray(worker.clockDates.breaks) && worker.clockDates.breaks.length > 0) {
        const lastBreak = worker.clockDates.breaks[worker.clockDates.breaks.length - 1];
        if (!lastBreak.breakEnd) {
          lastBreak.breakEnd = currentTime;
          // Calculate the duration of this break.
          const breakDuration = currentTime.getTime() - new Date(worker.pauseStartTime).getTime();
          worker.accumulatedPauseDuration = (worker.accumulatedPauseDuration || 0) + breakDuration;
        }
      }
      worker.status = "Work";
      worker.isTimerPaused = false;
      worker.pauseStartTime = null;
      await worker.save();

      console.log(`Worker ${userId} automatically set to Work (joined allowed channel).`);

      // Send DM about the automatic resume.
      try {
        const user = await client.users.fetch(userId);
        await user.send(
          `I automatically put you back to work since you joined the working channel.`
        );
      } catch (dmError) {
        console.error(`Failed to send DM to user ${userId} on resume:`, dmError);
      }
    }

  } catch (error) {
    console.error('Error in voiceStateUpdate handler:', error);
  }
});


module.exports = client;

// Start the bot.
const DISCORD_BOT_TOKEN = process.env.DISCORD_TOKEN;
client.login(DISCORD_BOT_TOKEN);
