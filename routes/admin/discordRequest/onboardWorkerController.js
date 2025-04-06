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
const Worker = require('../../../models/worker.model');
const SelectedGuild = require('../../../models/selectedGuild');
const authenticateUser = require('../../../middleware/authMiddleware');
const Role = require('../../../models/role');
const Department = require('../../../models/department');
const router = express.Router();

router.post('/onboard/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { formData } = req.body;

    console.log('User from request:', req.user);  // Check if user exists

    if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }

    try {
        const selectedGuild = await SelectedGuild.findOne({ userId: req.user.userId });
        if (!selectedGuild) {
            return res.status(404).json({ message: 'Selected guild not set for this user.' });
        }

        const { guildId } = selectedGuild;

        const worker = await Worker.findOne({ userId: id, guildId });
        if (!worker) {
            return res.status(404).json({ message: 'User not found in the selected guild.' });
        }

        Object.assign(worker, {
            firstName: formData.firstName,
            secondName: formData.secondName,
            lastName: formData.lastName,
            department: formData.department,
            hourlyRate: formData.hourlyRate,
            employeeType: formData.employeeType,
            role: formData.role,
            address: formData.address,
            emergencyContact: formData.emergencyContact,
            gender: formData.gender,
            experience: formData.experience,
            streetName: formData.streetName,
            city: formData.city,
            county: formData.county,
            country: formData.country,
            mobilePhone: formData.mobilePhone,
            profileStatus: 'Active',
            status: 'Offline',
        });

        await worker.save();

        res.status(200).json({ message: 'User onboarded successfully.' });
    } catch (error) {
        console.error('Error onboarding user:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


router.get('/api/onboard-data', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.userId;
      const selectedGuild = await SelectedGuild.findOne({ userId });
      if (!selectedGuild) {
        return res.status(400).json({ error: "No selected guild found for this user." });
      }
      const guildId = selectedGuild.guildId;
      const roles = await Role.find({ guildId, userId });
      const departments = await Department.find({ guildId, userId });
      return res.status(200).json({ roles, departments });
    } catch (error) {
      console.error('Error fetching onboard data:', error.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  
module.exports = router;
