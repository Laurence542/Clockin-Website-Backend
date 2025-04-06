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
const router = express.Router();
const authenticateUser = require('../../../middleware/authMiddleware');
const SelectedGuild = require('../../../models/selectedGuild');
const Department = require('../../../models/department');

router.post('/api/departments', authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Department name is required." });
    }

    // Retrieve the authenticated user's selected guild.
    const selectedGuild = await SelectedGuild.findOne({ userId: req.user.userId });
    if (!selectedGuild) {
      return res.status(400).json({ error: "No selected guild found for this user." });
    }
    const guildId = selectedGuild.guildId;
    const userId = req.user.userId;

    // Create a new department document.
    const newDepartment = new Department({ guildId, userId, name });
    await newDepartment.save();

    return res.status(201).json({
      message: "Department created successfully.",
      data: newDepartment
    });
  } catch (error) {
    console.error("Error creating department:", error.message);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
});


router.get('/api/departments', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.userId;
      // Find the user's selected guild
      const selectedGuild = await SelectedGuild.findOne({ userId });
      if (!selectedGuild) {
        return res.status(400).json({ error: "No selected guild found for this user." });
      }
      const guildId = selectedGuild.guildId;
      // Retrieve all departments for this guild and user
      const departments = await Department.find({ guildId, userId });
      return res.status(200).json({ data: departments });
    } catch (error) {
      console.error("Error retrieving departments:", error.message);
      return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  });
 
  
  router.delete('/api/departments/:id', authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
  
      // Retrieve the authenticated user's selected guild
      const selectedGuild = await SelectedGuild.findOne({ userId });
      if (!selectedGuild) {
        return res.status(400).json({ error: "No selected guild found for this user." });
      }
      const guildId = selectedGuild.guildId;
  
      // Delete the department if it belongs to this guild and user
      const deletedDept = await Department.findOneAndDelete({ _id: id, guildId, userId });
      if (!deletedDept) {
        return res.status(404).json({ error: "Department not found or unauthorized." });
      }
      return res.status(200).json({ message: "Department deleted successfully." });
    } catch (error) {
      console.error("Error deleting department:", error.message);
      return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  });
  

module.exports = router;
