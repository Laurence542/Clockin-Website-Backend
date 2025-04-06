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
const Tasks = require('../../../models/task');
const Worker  = require('../../../models/worker.model');
const SelectedGuild = require('../../../models/selectedGuild');
const authenticateUser = require('../../../middleware/authMiddleware');
const moment = require('moment');
const discordClient = require('../../../routes/workers/workSession/bot');
const VoiceChannel = require('../../../models/voiceChannel');

const router = express.Router();

router.get('/admin/tasks', authenticateUser, async (req, res) => {
  try {
    const authUserId = req.user?.userId;
    if (!authUserId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }

    // Find the authenticated user's selected guild
    const userGuild = await SelectedGuild.findOne({ userId: authUserId });
    if (!userGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }

    const guildId = userGuild.guildId;

    // Fetch tasks for the selected guild
    const tasks = await Tasks.find({ guildId });
    if (!tasks.length) {
      return res.status(404).json({ error: 'No tasks found for this guild.' });
    }

    // Extract userIds from tasks
    const userIds = tasks.map(task => task.userId).filter(Boolean);

    // Query workers for this selected guild only.
    const workers = await Worker.find({
      userId: { $in: userIds },
      guildId: guildId  // Only include workers from the selected guild
    }).select('userId firstName lastName role'); // Include the role field

    // Map worker names and roles to each task
    const tasksWithNames = tasks.map(task => {
      const worker = workers.find(worker => worker.userId === task.userId);
      let fullName = task.userId; // default fallback if no worker is found
      let department = '';       // default if no role is found
      
      if (worker) {
        if (worker.firstName || worker.lastName) {
          fullName = `${worker.firstName || ''} ${worker.lastName || ''}`.trim();
        }
        // Use the worker's role as their department
        department = worker.role || '';
      }
      return {
        ...task._doc,
        assignedToName: fullName,
        workerDepartment: department,
      };
    });

    res.status(200).json({ tasks: tasksWithNames });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal Server Error. Please try again later.' });
  }
});

// routes/admin.js
router.post('/admin/ticket', authenticateUser, async (req, res) => {
    try {
      // Destructure the task details sent from the frontend
      const { workerId, headline, description, dueDate, priority, status } = req.body;
  
      // Validate required fields
      if (!workerId || !headline || !description || !dueDate || !priority || !status) {
        return res.status(400).json({ error: 'Please provide all required fields.' });
      }
  
      // Validate the due date is not in the past
      const selectedDueDate = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDueDate < today) {
        return res.status(400).json({ error: 'Due date cannot be in the past.' });
      }
  
      // Get the authenticated user's ID (assumed to be in req.user.userId)
      const authUserId = req.user.userId;
  
      // Find the user's selected guild
      const selectedGuild = await SelectedGuild.findOne({ userId: authUserId });
      if (!selectedGuild) {
        return res.status(404).json({ error: 'No guild selected for this user.' });
      }
      const guildId = selectedGuild.guildId;
  
      // Create a new task using the Tasks schema, including the authenticated user's id in createdBy
      const newTask = new Tasks({
        guildId,               // Retrieved from the user's selected guild
        userId: workerId,      // The workerId selected in the form
        createdBy: authUserId, // Authenticated user who is creating the task
        headline,
        description,
        dueDate: selectedDueDate.toISOString(),
        priority,
        status,
      });
  
      // Save the new task to the database
      await newTask.save();
  
      // Send a DM to the assigned worker using discordClient
      try {
        const assignedWorker = await discordClient.users.fetch(workerId);
        if (assignedWorker) {
          await assignedWorker.send(
            `🎯 **You have New Task Assigned!**\n\n` +
            `**Task:** ${headline}\n` +
            `**Due Date:** ${moment(selectedDueDate).format('DD MMM YYYY')}\n\n` +
            `Please check your dashboard for more details.`
          );
        }
      } catch (dmError) {
        console.error(`Failed to send DM to user ${workerId}:`, dmError);
      }
  
      return res.status(201).json({
        message: 'Task successfully created!',
        task: newTask,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Internal Server Error. Please try again later.' });
    }
  });
  
  

// Update task status for the authenticated user's selected guild
router.put('/admin/tasks/:taskId', authenticateUser, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const userId = req.user?.userId; 

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    // Retrieve the user's selected guild
    const userGuild = await SelectedGuild.findOne({ userId });
    if (!userGuild) {
      return res.status(404).json({ error: 'No selected guild found for this user.' });
    }
    const guildId = userGuild.guildId;

    // Find the task by its ID and ensure it belongs to the user's selected guild
    const taskToUpdate = await Tasks.findOne({ _id: taskId, guildId });
    if (!taskToUpdate) {
      return res.status(404).json({ error: 'Task not found for the selected guild.' });
    }

    // Update the task status and save
    taskToUpdate.status = status;
    await taskToUpdate.save();

    res.json({ message: 'Task status updated successfully.', task: taskToUpdate });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
});



router.post('/api/new-voice-channel', authenticateUser, async (req, res) => {
  try {
    // Expecting channelId and channelName in the request body
    const { channelId, channelName } = req.body;
    
    if (!channelId || !channelName) {
      return res.status(400).json({ error: 'channelId and channelName are required.' });
    }
    
    // Retrieve the authenticated user's selected guild
    const selectedGuild = await SelectedGuild.findOne({ userId: req.user.userId });
    if (!selectedGuild) {
      return res.status(400).json({ error: 'No selected guild found for this user.' });
    }
    
    const guildId = selectedGuild.guildId;
    const userId = req.user.userId;

    // Create a new VoiceChannel document
    const newChannel = new VoiceChannel({
      guildId,
      userId,
      channelId,
      channelName
    });
    
    await newChannel.save();

    return res.status(201).json({
      message: "Voice channel saved successfully.",
      data: newChannel
    });
  } catch (error) {
    console.error("Error saving voice channel:", error.message);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

router.get('/api/voice-channels', authenticateUser, async (req, res) => {
  try {
    // Get the authenticated user's ID from the token
    const userId = req.user.userId;

    // Retrieve the selected guild for the user
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(400).json({ error: 'No selected guild found for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Find all voice channels for the authenticated user within the selected guild
    const channels = await VoiceChannel.find({ guildId, userId });

    return res.status(200).json({ data: channels });
  } catch (error) {
    console.error("Error retrieving voice channels:", error.message);
    return res.status(500).json({
      error: "Error retrieving voice channels",
      details: error.message,
    });
  }
});

router.delete('/api/voice-channels/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Retrieve the selected guild for the user
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(400).json({ error: 'No selected guild found for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Delete the voice channel if it matches the guildId and userId
    const result = await VoiceChannel.findOneAndDelete({ _id: id, guildId, userId });
    if (!result) {
      return res.status(404).json({ error: 'Voice channel not found or unauthorized.' });
    }
    return res.status(200).json({ message: "Voice channel deleted successfully." });
  } catch (error) {
    console.error("Error deleting voice channel:", error.message);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


module.exports = router;
