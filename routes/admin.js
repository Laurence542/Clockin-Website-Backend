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
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Worker = require('../models/worker');
const User = require('../models/User');
const TimeOffRequest = require('../models/timeOffRequest');
require('dotenv').config();

const router = express.Router();

router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const existingUser = await Worker.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new Worker({
            username,
            email,
            password: hashedPassword,
            role: 'admin',
        });
        
        await newAdmin.save();

        const token = jwt.sign(
            { id: newAdmin._id, role: newAdmin.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'Admin user created successfully',
            token,
            user: { username: newAdmin.username, email: newAdmin.email },
        });
    } catch (error) {
        console.error("Error creating admin:", error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
});

router.put('/users/:guildId/update/:userId', async (req, res) => {
  const { guildId, userId } = req.params;
  const updatedData = req.body;

  try {
      const guild = await Worker.findOne({ guildId });

      if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
      }

      const userIndex = guild.workers.findIndex((worker) => worker.userId === userId);

      if (userIndex === -1) {
          return res.status(404).json({ error: 'User not found' });
      }

      Object.assign(guild.workers[userIndex], updatedData);

      await guild.save();

      res.json({ message: 'User updated successfully', user: guild.workers[userIndex] });
  } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await User.findOne({ email, role: 'admin' });
        if (!admin) return res.status(404).json({ error: 'Admin user not found' });

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, username: admin.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});


router.get('/users/details/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const guildWorkers = await Worker.findOne({ "workers.userId": userId });

        if (!guildWorkers) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = guildWorkers.workers.find(worker => worker.userId === userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.userId,
            name: user.username || 'N/A',
            email: user.email || 'N/A',
            avatar: user.avatar,
            status: user.status || 'N/A',
            experience: user.experience || 'N/A',
            role: user.role || 'N/A',
            breaksCount: user.breaksCount || 0,
            breakTime: user.breakTime || 0,
            dailyWorked: user.dailyWorked || 0,
            weeklyWorked: user.weeklyWorked || 0,
            totalWorked: user.totalWorked || 0,
            worked: user.worked || 0, 
            registrationDate: user.clockDates.clockIn[0] || 'N/A',
        });
    } catch (error) {
        console.error('Error retrieving user details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


  
  router.post("/api/onboard/:userId", async (req, res) => {
    const { userId } = req.params;
    const updatedData = req.body;
  
    try {

      const updateFields = {};
      if (updatedData.username) updateFields["workers.$.username"] = updatedData.username;
      if (updatedData.email) updateFields["workers.$.email"] = updatedData.email;
      if (updatedData.role) updateFields["workers.$.role"] = updatedData.role;
      if (updatedData.status) updateFields["workers.$.status"] = updatedData.status;
  
      const result = await GuildWorkers.findOneAndUpdate(
        { "workers.userId": userId },
        { $set: updateFields },
        { new: true }
      );
  
      if (!result) {
        return res.status(404).json({ message: "User not found" });
      }
  
      res.status(200).json({ message: "User updated successfully", user: result });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user details" });
    }
  });
  
  
  
  router.post('/onboard/:userId', async (req, res) => {
    const { userId } = req.params;
    const { guildId, name, email, role, status } = req.body; 
  
    try {
      const guildWorkers = await Worker.findOne({ guildId });
  
      if (!guildWorkers) {
        return res.status(404).json({ error: 'Guild not found' });
      }
  
      const user = guildWorkers.workers.find(worker => worker.userId === userId);
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      user.username = name || user.username;
      user.email = email || user.email;
      user.role = role || user.role;
      user.status = status || user.status;
  
      await guildWorkers.save(); 
  
      res.json({ message: 'User details updated successfully' });
    } catch (error) {
      console.error('Error updating user details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  
module.exports = router;
