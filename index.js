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

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/discordAuthRoutes');
const SelectedGuild = require('./models/selectedGuild');
const admin = require('./routes/admin')
const WorkerOnboarding = require('./routes/admin/authentication/Worker/WorkerOnboarding')
const WorkHistory = require('./routes/workers/workHistory/workHistoryService')
const requestTimeOffController = require('./routes/workers/requestTimeOff/timeOffRoutesController')
const requestTimeOffService = require('./routes/workers/requestTimeOff/timeOffRoutesService')
const earnings = require('./routes/workers/workSession/earningService')
const weeklyEarnings = require('./routes/workers/workSession/weeklyEarningsService')
const monthlyEarnings = require('./routes/workers/workSession/monthlyEarningsService')
const updateStatusToWork = require('./routes/workers/workSession/updateStatusToWorkService')
const updateStatusToBreak = require('./routes/workers/workSession/updateStatusToBreakService')
const clockOut = require('./routes/workers/workSession/clockoutController')
const clockin = require('./routes/workers/workSession/clockinService')
const Task = require('./routes/workers/task/taskService')
const AdminDiscordRequest = require('./routes/admin/discordRequest/discordRequestService')
const AdminOnboardWorker = require('./routes/admin/discordRequest/onboardWorkerController')
const AdminDeclineUser = require('./routes/admin/discordRequest/declineUserController')
const AdminContractorRoster = require('./routes/admin/contractor/contrctorRosterController')
const AdminContractorTask = require('./routes/admin/task/contractorTask')
const AdminWorkHistory = require('./routes/admin/workHistory/workHistory')
const VoiceChannel = require('./models/voiceChannel')
const Profile = require('./routes/workers/profile/profile')
const Authentication = require('./routes/authentication/discordAuthRoutes')
const AdminDepartment = require('./routes/admin/settings/departmentRoutes')
const AdminRole = require('./routes/admin/settings/roleRoutes')
const { createClient } = require('redis');
const app = express();
const authenticateUser = require('./middleware/authMiddleware');


app.use(express.json());

app.use(express.urlencoded({ extended: true }));

const allowedOrigins = ['http://localhost:443', 'http://138.199.196.134:443'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true, 
}));


mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));


app.use(cookieParser());
const PORT = process.env.PORT || 443;

app.use(authRoutes);
app.use('/api', admin);
app.use('/api', WorkerOnboarding);
app.use(WorkHistory);
app.use(requestTimeOffController);
app.use(requestTimeOffService);
app.use(earnings);
app.use(weeklyEarnings);
app.use(monthlyEarnings);
app.use(updateStatusToWork)
app.use(updateStatusToBreak)
app.use(clockin)
app.use(clockOut)
app.use(Task)
app.use(AdminDiscordRequest)
app.use(AdminOnboardWorker)
app.use(AdminDeclineUser)
app.use(AdminContractorRoster)
app.use(AdminContractorTask)
app.use(AdminWorkHistory)
app.use(Profile)
app.use(Authentication)
app.use(AdminDepartment)
app.use(AdminRole)

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});