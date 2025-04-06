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
const Role = require('../../../models/role');

// POST /api/roles - Create a new role
router.post('/api/roles', authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Role name is required." });
    }

    // Retrieve the authenticated user's selected guild.
    const selectedGuild = await SelectedGuild.findOne({ userId: req.user.userId });
    if (!selectedGuild) {
      return res.status(400).json({ error: "No selected guild found for this user." });
    }
    const guildId = selectedGuild.guildId;
    const userId = req.user.userId;

    // Create a new Role document.
    const newRole = new Role({ guildId, userId, name });
    await newRole.save();

    return res.status(201).json({
      message: "Role created successfully.",
      data: newRole,
    });
  } catch (error) {
    console.error("Error creating role:", error.message);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

// GET /api/roles - Retrieve roles for the authenticated user's selected guild
router.get('/api/roles', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(400).json({ error: "No selected guild found for this user." });
    }
    const guildId = selectedGuild.guildId;

    const roles = await Role.find({ guildId, userId });
    return res.status(200).json({ data: roles });
  } catch (error) {
    console.error("Error retrieving roles:", error.message);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// DELETE /api/roles/:id - Delete a role
router.delete('/api/roles/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Retrieve the authenticated user's selected guild.
    const selectedGuild = await SelectedGuild.findOne({ userId });
    if (!selectedGuild) {
      return res.status(400).json({ error: "No selected guild found for this user." });
    }
    const guildId = selectedGuild.guildId;

    const deletedRole = await Role.findOneAndDelete({ _id: id, guildId, userId });
    if (!deletedRole) {
      return res.status(404).json({ error: "Role not found or unauthorized." });
    }
    return res.status(200).json({ message: "Role deleted successfully." });
  } catch (error) {
    console.error("Error deleting role:", error.message);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

module.exports = router;
