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
const moment = require('moment');
const authenticateUser = require('../../../middleware/authMiddleware');
const WorkSession = require('../../../models/workSession');
const SelectedGuild = require('../../../models/selectedGuild');
const Worker = require('../../../models/worker.model');
const Tasks = require('../../../models/task'); 
const router = express.Router();

// Route for clocking out when task is complete
router.post('/clockout', authenticateUser, async (req, res) => {
  try {
    // Extract data from the request body
    const { clockOutTime, totalEarnings, workDescription, taskId, taskHeading, status } = req.body;
    const userId = req.user.userId;

    // Retrieve the authenticated user's selected guild
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(400).json({ error: 'No selected guild found for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Retrieve the worker record which should contain the singular clockInTime
    const worker = await Worker.findOne({ guildId, userId });
    if (!worker || !worker.clockInTime) {
      return res.status(400).json({ error: 'Clock in time not found for this user.' });
    }

    // Use the worker's stored clockInTime (assumed to be saved in UTC)
    const clockInTime = worker.clockInTime;

    // Calculate total break duration (in ms) from the breaks array
    let totalBreakDurationMs = 0;
    if (worker.clockDates && worker.clockDates.breaks && worker.clockDates.breaks.length > 0) {
      worker.clockDates.breaks.forEach(b => {
        if (b.breakStart && b.breakEnd) {
          totalBreakDurationMs += (new Date(b.breakEnd) - new Date(b.breakStart));
        }
      });
    }

    // Calculate worked duration: (clockOut - clockIn) minus total break duration
    const workedDurationMs = new Date(clockOutTime) - new Date(clockInTime) - totalBreakDurationMs;

    // Format worked duration as hours and minutes using moment.duration
    const workedDuration = moment.duration(workedDurationMs);
    const hoursWorked = Math.floor(workedDuration.asHours());
    const minutesWorked = workedDuration.minutes();
    const totalWorkedTimeStr = `${hoursWorked}h ${minutesWorked}m`;

    // Format total break duration similarly
    const breakDuration = moment.duration(totalBreakDurationMs);
    const breakHours = Math.floor(breakDuration.asHours());
    const breakMinutes = breakDuration.minutes();
    const totalBreakTimeStr = `${breakHours}h ${breakMinutes}m`;

    // Create a new WorkSession document with the computed details
    const workSession = new WorkSession({
      guildId,
      userId,
      clockInTime,
      clockOutTime,
      totalWorkedTime: totalWorkedTimeStr,
      totalBreakTime: totalBreakTimeStr,
      totalEarnings,
      workDescription,
      taskHeading,
      status, // "Complete" for this route
    });

    await workSession.save();

    //  Update associated task status if needed
    if (taskId) {
      const task = await Tasks.findById(taskId);
      if (task) {
        task.status = "Complete";
        await task.save();
      }
    }

    // Clear the worker's clock data by resetting clockInTime and optionally breaks
    worker.clockInTime = null;
    worker.accumulatedPauseDuration = 0;
    worker.isTimerPaused = false;
    worker.pauseStartTime = null;
    worker.status = 'Offline';
    worker.breaksCount = 0;

    // Optionally, reset break data if you're keeping it in clockDates
    if (worker.clockDates) {
      worker.clockDates.breaks = [];
    }
    await worker.save();

    res.status(200).json({ message: 'Work session saved successfully and clock data cleared.' });
  } catch (error) {
    console.error("Error saving work session:", error.message);
    res.status(500).json({ error: 'Failed to save work session', details: error.message });
  }
});

// Route for clocking out when task is still in progress
router.post('/ClockOutInProgress', authenticateUser, async (req, res) => {
  try {
    const { clockOutTime, totalEarnings, workDescription, taskId, taskHeading, status } = req.body;
    const userId = req.user.userId;

    // Retrieve the user's selected guild
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(400).json({ error: 'No selected guild found for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Retrieve the worker record
    const worker = await Worker.findOne({ guildId, userId });
    if (!worker || !worker.clockInTime) {
      return res.status(400).json({ error: 'Clock in time not found for this user.' });
    }

    const clockInTime = worker.clockInTime;

    // Calculate total break duration (in ms)
    let totalBreakDurationMs = 0;
    if (worker.clockDates && worker.clockDates.breaks && worker.clockDates.breaks.length > 0) {
      worker.clockDates.breaks.forEach(b => {
        if (b.breakStart && b.breakEnd) {
          totalBreakDurationMs += (new Date(b.breakEnd) - new Date(b.breakStart));
        }
      });
    }

    // Calculate worked duration: (clockOut - clockIn) minus break duration
    const workedDurationMs = new Date(clockOutTime) - new Date(clockInTime) - totalBreakDurationMs;

    // Format worked and break durations
    const workedDuration = moment.duration(workedDurationMs);
    const hoursWorked = Math.floor(workedDuration.asHours());
    const minutesWorked = workedDuration.minutes();
    const totalWorkedTimeStr = `${hoursWorked}h ${minutesWorked}m`;

    const breakDuration = moment.duration(totalBreakDurationMs);
    const breakHours = Math.floor(breakDuration.asHours());
    const breakMinutes = breakDuration.minutes();
    const totalBreakTimeStr = `${breakHours}h ${breakMinutes}m`;

    // Create and save the work session with status "In progress"
    const workSession = new WorkSession({
      guildId,
      userId,
      clockInTime,
      clockOutTime,
      totalWorkedTime: totalWorkedTimeStr,
      totalBreakTime: totalBreakTimeStr,
      totalEarnings,
      workDescription,
      taskHeading,
      status, // "In progress" for this route
    });

    await workSession.save();

    // Update associated task status if needed
    if (taskId) {
      const task = await Tasks.findById(taskId);
      if (task) {
        task.status = "In Progress";
        await task.save();
      }
    }

     // Clear the worker's clock data by resetting clockInTime and optionally breaks
     worker.clockInTime = null;
     worker.accumulatedPauseDuration = 0;
     worker.isTimerPaused = false;
     worker.pauseStartTime = null;
     worker.status = 'Offline';
     worker.breaksCount = 0;

    // Clear worker's clock data (reset clockInTime and breaks)
    worker.clockInTime = null;
    if (worker.clockDates) {
      worker.clockDates.breaks = [];
    }
    await worker.save();

    res.status(200).json({ message: 'Work session saved successfully and clock data cleared.' });
  } catch (error) {
    console.error("Error saving work session:", error.message);
    res.status(500).json({ error: 'Failed to save work session', details: error.message });
  }
});

module.exports = router;
