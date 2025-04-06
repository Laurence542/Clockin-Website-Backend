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

const Tasks = require('../../../models/task');
const express = require('express');
const authenticateUser = require('../../../middleware/authMiddleware');
const SelectedGuild = require('../../../models/selectedGuild');
const router = express.Router();



router.get('/tasks', authenticateUser, async (req, res) => {
  try {
      const userId = req.user.userId;

      // Retrieve the selected guild ID for the user
      const selectedGuild = await SelectedGuild.findOne({ userId });

      if (!selectedGuild) {
          return res.status(400).json({ error: 'No selected guild found for this user.' });
      }

      const { guildId } = selectedGuild;

      // Fetch tasks that match the selected guild ID and user ID
      const tasks = await Tasks.find({ guildId, userId });

      if (!tasks.length) {
          return res.status(404).json({ error: 'You currently don\'t have any tasks assigned in this guild.' });
      }

      const filteredTasks = tasks.filter(task =>
          ['On Hold', 'In Progress', 'Open'].includes(task.status)
      );

      if (!filteredTasks.length) {
          return res.status(404).json({ error: 'No active tasks found for the selected guild.' });
      }

      const responseTasks = filteredTasks.map(task => ({
          id: task._id,
          headline: task.headline,
          description: task.description,
          dueDate: task.dueDate,
          priority: task.priority,
          status: task.status,
      }));

      res.status(200).json({ tasks: responseTasks });
  } catch (error) {
      console.error('Error retrieving tasks:', error.message);
      res.status(500).json({ error: 'Failed to retrieve tasks.' });
  }
});


router.get('/user-tasks', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Retrieve the user's selected guild from the backend
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(400).json({ error: 'No selected guild found for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Query tasks for this guild and user while filtering by allowed statuses
    const tasks = await Tasks.find({
      guildId,
      userId,
      status: { $in: ['On Hold', 'In Progress', 'Open'] }
    });
    
    if (!tasks.length) {
      return res.status(404).json({ error: 'No tasks found for the authenticated user.' });
    }

    // Map the results to include only the task ID and headline
    const taskHeadings = tasks.map(task => ({
      id: task._id,
      headline: task.headline,
    }));

    res.status(200).json({ taskHeadings });
  } catch (error) {
    console.error('Error retrieving user tasks:', error.message);
    res.status(500).json({ error: 'Failed to retrieve tasks.' });
  }
});

router.patch('/tasks/:taskId/status', authenticateUser, async (req, res) => {
  try {
      const { taskId } = req.params;
      const { newStatus } = req.body;
      const userId = req.user.userId;

      if (!taskId || !newStatus) {
          return res.status(400).json({ error: 'Task ID and new status are required.' });
      }

      // Retrieve the user's selected guild ID
      const selectedGuild = await SelectedGuild.findOne({ userId });

      if (!selectedGuild) {
          return res.status(400).json({ error: 'No selected guild found for this user.' });
      }

      const { guildId } = selectedGuild;

      // Find the task that matches the user, selected guild, and task ID
      const task = await Tasks.findOne({ _id: taskId, userId, guildId });

      if (!task) {
          return res.status(404).json({ error: 'Task not found or unauthorized.' });
      }

      // Update the task status
      task.status = newStatus;
      await task.save();

      res.status(200).json({ message: 'Task status updated successfully.', task });
  } catch (error) {
      console.error('Error updating task status:', error.message);
      res.status(500).json({ error: 'Failed to update task status.' });
  }
});


module.exports = router;