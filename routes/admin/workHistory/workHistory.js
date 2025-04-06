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
const WorkHistorys = require('../../../models/workSession');
const WorkSession = require('../../../models/workSession');
const Worker  = require('../../../models/worker.model');
const SelectedGuild = require('../../../models/selectedGuild');
const authenticateUser = require('../../../middleware/authMiddleware');
const router = express.Router();

router.get('/admin/workhistory', authenticateUser, async (req, res) => {
    try {
      // Retrieve the authenticated user's ID
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
      }
  
      // Get the selected guild for the authenticated user
      const userGuild = await SelectedGuild.findOne({ userId });
      if (!userGuild) {
        return res.status(404).json({ message: 'No guild selected for this user.' });
      }
      const guildId = userGuild.guildId;
  
      // Get pagination parameters
      let { page = 1, limit = 10 } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);
  
      // Count total documents for pagination
      const totalDocuments = await WorkHistorys.countDocuments({ guildId });
  
      // Fetch work history sessions for this guild
      const workhistory = await WorkHistorys.find({ guildId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
  
      // Fetch all workers for this guild from the Worker collection
      const workers = await Worker.find({ guildId }).lean();
      const workersMap = new Map();
      workers.forEach(worker => {
        workersMap.set(worker.userId, {
          firstName: worker.firstName || "Unknown",
          secondName: worker.secondName || "Unknown",
          role: worker.role || "N/A"
        });
      });
  
      // For each work history session, attach the worker details based on the session.userId
      workhistory.forEach(session => {
        const details = workersMap.get(session.userId);
        if (details) {
          session.firstName = details.firstName;
          session.secondName = details.secondName;
          session.role = details.role;
        } else {
          session.firstName = "Unknown";
          session.secondName = "";
          session.role = "N/A";
        }
      });
  
      res.status(200).json({
        workhistory,
        currentPage: page,
        totalPages: Math.ceil(totalDocuments / limit),
        totalItems: totalDocuments,
      });
    } catch (error) {
      console.error('Error fetching work history:', error);
      res.status(500).json({ message: 'Server error occurred while fetching work history.' });
    }
  });


router.post("/api/work-sessions/add-session", authenticateUser, async (req, res) => {
    try {
        const { workers } = req.body;

        if (!workers || !workers.length) {
            return res.status(400).json({ error: "Workers data is required." });
        }

        // Retrieve the authenticated user's ID
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized: User ID not found." });
        }

        // Find the selected guild for the authenticated user
        const userGuild = await SelectedGuild.findOne({ userId });
        if (!userGuild) {
            return res.status(404).json({ error: "No guild selected for this user." });
        }
        const guildId = userGuild.guildId;

        // Map the incoming workers data into WorkSession documents
        const workSessions = workers.map((worker) => {
            // Parse clock-in and clock-out times
            const clockIn = new Date(worker.clockInTime);
            const clockOut = new Date(worker.clockOutTime);
            
            // Calculate the difference in milliseconds
            const diffMs = clockOut - clockIn;
            // Calculate full hours worked
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            // Calculate remaining minutes
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            // Format total worked time as a string
            const totalWorkedTime = `${diffHours} hours ${diffMinutes} minutes`;

            return {
                guildId,
                userId: worker.userId,
                taskId: worker.taskId,
                taskHeading: worker.taskHeading,
                clockInTime: clockIn,
                clockOutTime: clockOut,
                totalWorkedTime, // New field being saved
                totalEarnings: worker.totalEarnings,
                workDescription: worker.workDescription,
                status: worker.status || "Pending"
            };
        });

        // Save all work sessions to the database
        await WorkSession.insertMany(workSessions);

        res.status(201).json({ message: "Work sessions added successfully!" });
    } catch (error) {
        console.error("Error saving work sessions:", error);
        res.status(500).json({ error: "Server error. Failed to add work sessions." });
    }
});

module.exports = router;
