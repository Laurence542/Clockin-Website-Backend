const express = require('express');
const router = express.Router();
const Worker = require('../../../models/worker.model'); 
const SelectedGuild = require('../../../models/selectedGuild'); 
const WorkSession = require('../../../models/workSession'); 
const authenticateUser = require('../../../middleware/authMiddleware');
const Task = require('../../../models/task');
const TimeOffRequest = require('../../../models/timeOffRequest')
const redis = require('../../../utils/redisClient');


router.get('/api/users', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }
    
    // Retrieve the selected guild for this user
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Directly query the database without Redis caching.
    // Return users with profileStatus either "Active" or "Terminated"
    const workers = await Worker.find({ 
      guildId, 
      profileStatus: { $in: ["Active", "Terminated"] } 
    }).lean();

    // Map the users to the desired response format.
    const mappedUsers = workers.map(user => ({
      id: user.userId,
      name: user.username || 'N/A',
      email: user.email || 'N/A',
      avatar: user.avatar,
      status: user.status || 'N/A',
      experience: user.experience || 'N/A',
      role: user.role || 'N/A',
      breaksCount: user.breaksCount || 0,
      breakTime: user.breakTime || 0,
      dailyWorked: "",
      weeklyWorked: "",
      monthlyWorked: "",
      totalWorked: user.totalWorked || 0,
      firstName: user.firstName || '',
      secondName: user.secondName || '',
      lastName: user.lastName || '',
      profileStatus: user.profileStatus,
    }));
    
    // Define time boundaries for aggregation (for the current day, week, month)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // For week: assuming week starts on Sunday
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // For month:
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Helper function: aggregate total duration (in milliseconds) for a given user and time range
    const getAggregateDuration = async (userId, start, end) => {
      const agg = await WorkSession.aggregate([
        {
          $match: {
            guildId: guildId,
            userId: userId,
            clockInTime: { $gte: start, $lt: end },
          },
        },
        {
          $group: {
            _id: null,
            totalMillis: { $sum: { $subtract: ["$clockOutTime", "$clockInTime"] } },
          },
        },
      ]);
      return agg.length > 0 ? agg[0].totalMillis : 0;
    };

    // Helper function: convert milliseconds to a string "Xh Ym"
    const convertMillisToTime = (ms) => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    };

    // For each user, compute daily, weekly, and monthly aggregates from WorkSession.
    await Promise.all(mappedUsers.map(async (user) => {
      const dailyMillis = await getAggregateDuration(user.id, startOfToday, endOfToday);
      const weeklyMillis = await getAggregateDuration(user.id, startOfWeek, endOfWeek);
      const monthlyMillis = await getAggregateDuration(user.id, startOfMonth, endOfMonth);
      user.dailyWorked = convertMillisToTime(dailyMillis);
      user.weeklyWorked = convertMillisToTime(weeklyMillis);
      user.monthlyWorked = convertMillisToTime(monthlyMillis);
    }));

    res.json(mappedUsers);
    
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/api/users/:userId', authenticateUser, async (req, res) => {
  try {
    // Get the authenticated user's ID (used for retrieving the selected guild)
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }

    // Retrieve the selected guild for the authenticated user
    const selectedGuild = await SelectedGuild.findOne({ userId: currentUserId });
    if (!selectedGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Find the worker (the target user) within that guild without using caching
    const user = await Worker.findOne({
      guildId,
      userId: req.params.userId,  // Using the URL parameter
      profileStatus: { $in: ["Active", "Terminated"] }
    }).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Map the worker to the desired shape.
    const mappedUser = {
      id: user.userId,
      username: user.username || 'N/A',
      email: user.email || 'N/A',
      avatar: user.avatar,
      status: user.status || 'N/A',
      emergencyContact: user.emergencyContact || 'N/A',
      employeeStatus: user.employeeStatus || 'N/A',
      role: user.role || 'N/A',
      breaksCount: user.breaksCount || 0,
      breakTime: user.breakTime || 0,
      experience: user.experience,
      dailyWorked: '',
      weeklyWorked: '',
      monthlyWorked: '',
      totalWorked: user.totalWorked || 0,
      firstName: user.firstName || '',
      secondName: user.secondName || '',
      lastName: user.lastName || '',
      // Optional additional fields:
      address: user.address || 'N/A',
      // registrationDate: user.clockDates?.clockIn?.[0] || 'N/A',
    };

    // Define time boundaries for aggregation (for current day, week, and month)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Helper function: aggregate total duration (in milliseconds) for a given user and time range
    const getAggregateDuration = async (userId, start, end) => {
      const agg = await WorkSession.aggregate([
        {
          $match: {
            guildId,
            userId, // using the URL parameter value
            clockInTime: { $gte: start, $lt: end },
          },
        },
        {
          $group: {
            _id: null,
            totalMillis: { $sum: { $subtract: ["$clockOutTime", "$clockInTime"] } },
          },
        },
      ]);
      return agg.length > 0 ? agg[0].totalMillis : 0;
    };

    // Helper function: convert milliseconds to "Xh Ym" format
    const convertMillisToTime = (ms) => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    };

    // Compute aggregates for daily, weekly, and monthly worked durations for the target user
    const dailyMillis = await getAggregateDuration(req.params.userId, startOfToday, endOfToday);
    const weeklyMillis = await getAggregateDuration(req.params.userId, startOfWeek, endOfWeek);
    const monthlyMillis = await getAggregateDuration(req.params.userId, startOfMonth, endOfMonth);
    mappedUser.dailyWorked = convertMillisToTime(dailyMillis);
    mappedUser.weeklyWorked = convertMillisToTime(weeklyMillis);
    mappedUser.monthlyWorked = convertMillisToTime(monthlyMillis);

    // Retrieve tasks for the target user
    const tasks = await Task.find({ guildId, userId: req.params.userId }).lean();
    mappedUser.tasks = tasks;

    // Retrieve work history for the target user
    const workHistory = await WorkSession.find({ guildId, userId: req.params.userId }).lean();
    mappedUser.workHistory = workHistory;

    // Retrieve time off requests for the target user
    const timeOffRequests = await TimeOffRequest.find({ guildId, userId: req.params.userId }).lean();
    mappedUser.timeOffRequests = timeOffRequests;

    res.json(mappedUser);

  } catch (error) {
    console.error('Error retrieving user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Update worker information
router.put("/api/users/:userId", authenticateUser, async (req, res) => {
  try {
    // Get the authenticated user's ID
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }

    // Retrieve the selected guild for the authenticated user
    const selectedGuild = await SelectedGuild.findOne({ userId: currentUserId });
    if (!selectedGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Update the Worker based on guildId and the provided userId
    const updatedUser = await Worker.findOneAndUpdate(
      { guildId, userId: req.params.userId },
      { $set: req.body },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Error updating user" });
  }
});


// Update time off request status
router.put("/api/timeoffrequests/:requestId/status", authenticateUser, async (req, res) => {
  try {
    // Get the authenticated user's ID
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }

    // Retrieve the selected guild for the authenticated user
    const selectedGuild = await SelectedGuild.findOne({ userId: currentUserId });
    if (!selectedGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Get the new status from the request body
    const { status } = req.body;
    // Validate the status value
    if (!['approved', 'pending', 'disapproved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    // Update the time off request if it belongs to the authenticated user's guild
    const updatedRequest = await TimeOffRequest.findOneAndUpdate(
      { _id: req.params.requestId, guildId },
      { $set: { status } },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Time off request not found or not authorized.' });
    }
    
    res.json(updatedRequest);
  } catch (error) {
    console.error("Error updating time off request:", error);
    res.status(500).json({ error: "Error updating time off request" });
  }
});


router.put('/api/users/:userId/terminate', authenticateUser, async (req, res) => {
  try {
    // Get the authenticated user's ID
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }

    // Retrieve the selected guild for the authenticated user
    const selectedGuild = await SelectedGuild.findOne({ userId: currentUserId });
    if (!selectedGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Update the worker (target user) based on guildId and the provided userId,
    // setting profileStatus to "Terminated"
    const updatedUser = await Worker.findOneAndUpdate(
      { guildId, userId: req.params.userId },
      { $set: { profileStatus: "Terminated" } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error("Error terminating user:", error);
    res.status(500).json({ error: "Error terminating user" });
  }
});

router.get('/api/timeoffrequests', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }

    // Retrieve the selected guild for this user.
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Retrieve all time-off requests for this guild.
    const timeOffRequests = await TimeOffRequest.find({ guildId }).lean();

    // Retrieve all workers for this guild.
    const workers = await Worker.find({ guildId }).lean();
    // Create a mapping from userId to full name.
    const workerMap = {};
    workers.forEach(worker => {
      // Concatenate firstName and secondName and trim extra spaces.
      workerMap[worker.userId] = `${worker.firstName || ''} ${worker.secondName || ''}`.trim();
    });

    // Add a 'requestedBy' field to each request.
    const requestsWithRequestedBy = timeOffRequests.map(request => ({
      ...request,
      requestedBy: workerMap[request.userId] || 'Unknown'
    }));

    // Sort the requests so that newer ones come first.
    requestsWithRequestedBy.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json(requestsWithRequestedBy);
  } catch (error) {
    console.error('Error retrieving time off requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/api/activeUsersCount', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }
    
    // Retrieve the selected guild for this user.
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }
    const guildId = selectedGuild.guildId;
    
    // Count all workers in this guild that have an "Active" profileStatus.
    const count = await Worker.countDocuments({ guildId, profileStatus: "Active" });
    
    res.json({ count });
  } catch (error) {
    console.error('Error retrieving active users count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/api/earnings', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }

    // Retrieve the selected guild for this user.
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Define time boundaries.
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const endOfYesterday = startOfToday;

    // Aggregate today's earnings.
    const todayAgg = await WorkSession.aggregate([
      {
        $match: {
          guildId,
          clockInTime: { $gte: startOfToday, $lt: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalEarnings' },
        },
      },
    ]);
    const todayEarnings = todayAgg.length > 0 ? todayAgg[0].totalEarnings : 0;

    // Aggregate yesterday's earnings.
    const yesterdayAgg = await WorkSession.aggregate([
      {
        $match: {
          guildId,
          clockInTime: { $gte: startOfYesterday, $lt: endOfYesterday },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalEarnings' },
        },
      },
    ]);
    const yesterdayEarnings = yesterdayAgg.length > 0 ? yesterdayAgg[0].totalEarnings : 0;

    // Aggregate total earnings (all sessions for this guild).
    const totalAgg = await WorkSession.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalEarnings' },
        },
      },
    ]);
    const totalEarnings = totalAgg.length > 0 ? totalAgg[0].totalEarnings : 0;

    res.json({ todayEarnings, yesterdayEarnings, totalEarnings });
  } catch (error) {
    console.error("Error fetching earnings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get('/api/weeklyEarnings', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }

    // Retrieve the selected guild for this user.
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }
    const guildId = selectedGuild.guildId;

    // Calculate the start of the week (Monday) for the current week.
    const now = new Date();
    const day = now.getDay(); // Sunday = 0, Monday = 1, etc.
    // If today is Sunday (0), we want Monday of last week, so subtract 6 days.
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    // Sunday is 7 days after Monday.
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);

    // Aggregate work sessions between Monday and Sunday.
    const agg = await WorkSession.aggregate([
      {
        $match: {
          guildId,
          clockInTime: { $gte: monday, $lt: sunday },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$clockInTime" },
          totalEarnings: { $sum: "$totalEarnings" },
        },
      },
    ]);

    // MongoDB $dayOfWeek returns: 1 (Sunday), 2 (Monday), …, 7 (Saturday).
    // We'll map them into an array of 7 values with Monday as index 0 and Sunday as index 6.
    const earningsArray = Array(7).fill(0);
    agg.forEach(item => {
      const dayNum = item._id;
      let index;
      if (dayNum === 1) {
        index = 6; // Sunday goes to index 6.
      } else {
        index = dayNum - 2; // Monday (2) => 0, Tuesday (3) => 1, etc.
      }
      earningsArray[index] = item.totalEarnings;
    });

    const labels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    res.json({ labels, earnings: earningsArray });
  } catch (error) {
    console.error("Error fetching weekly earnings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get('/api/monthlyEarnings', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found.' });
    }

    // Retrieve the selected guild for this user.
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(404).json({ error: 'No guild selected for this user.' });
    }
    const guildId = selectedGuild.guildId;

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    // Aggregate work sessions for the current year.
    const agg = await WorkSession.aggregate([
      {
        $match: {
          guildId,
          clockInTime: { $gte: startOfYear, $lt: startOfNextYear },
        },
      },
      {
        $group: {
          _id: { $month: "$clockInTime" },
          totalEarnings: { $sum: "$totalEarnings" },
        },
      },
    ]);

    // Initialize an array of 12 months (January at index 0)
    const earningsArray = Array(12).fill(0);
    agg.forEach(item => {
      const month = item._id; // month 1 to 12
      earningsArray[month - 1] = item.totalEarnings;
    });

    const labels = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    res.json({ labels, earnings: earningsArray });
  } catch (error) {
    console.error("Error fetching monthly earnings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
