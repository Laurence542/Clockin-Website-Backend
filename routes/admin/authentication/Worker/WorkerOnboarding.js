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

require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { Client, GatewayIntentBits } = require("discord.js");
const GuildWorkers = require("../../../../models/worker");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const botToken = process.env.DISCORD_TOKEN;
client.login(botToken);

router.post("/onboarding", async (req, res) => {
  const {
    userId,
    username,
    firstname,
    lastname,
    password,
    role,
    department,
  } = req.body;

  const guildId = "1297549451010773072";

  try {
 
    let guildWorkers = await GuildWorkers.findOne({ guildId });

    if (!guildWorkers) {
      guildWorkers = new GuildWorkers({ guildId, workers: [] });
    }

    const existingUser = guildWorkers.workers.find(
      (worker) => worker.userId === userId || worker.username === username
    );

    if (existingUser) {
      return res.status(400).json({
        error: `A user with ${
          existingUser.userId === userId ? "userId" : "username"
        } already exists.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    guildWorkers.workers.push({
      userId,
      username,
      avatar: "", 
      email: "", 
      password: hashedPassword,
      clockDates: { clockIn: [], clockOut: [] },
      afkDates: { afkIn: [], afkOut: [] },
      onLeave: { start: "", end: "" },
      clockInMessage: "",
      afkMessage: "",
      status: "active", 
      experience: "",
      roleId: "",
      breaksCount: 0,
      accessToken: "",
      refreshToken: "",
      role,
      worked: 0,
      breakTime: 0,
      dailyWorked: 0,
      weeklyWorked: 0,
      profileStatus: "pending", 
      totalWorked: 0,
      address: "",
      emergencyContact: "",
      employeeStatus: "new",
      gender: "",
    });

    await guildWorkers.save();

    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);

    if (member) {
      try {
        await member.send(
          `Hi ${firstname}, welcome to Segritude!` +
            `\nYour username is ${username} and your temporary password is: ${password}.` +
            `\nUse the link below to log in to your account:` +
            `\n[Log In to Your Account](http://localhost:3000)`
        );
      } catch (err) {
        console.error("Failed to send DM:", err);
        return res
          .status(500)
          .json({ error: "Failed to send a direct message." });
      }
    }

    res.status(201).json({ message: "Worker onboarded successfully!" });
  } catch (error) {
    console.error("Error onboarding worker:", error);
    res.status(500).json({ error: "Failed to onboard worker." });
  }
});

module.exports = router;
