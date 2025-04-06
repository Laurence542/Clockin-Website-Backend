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

const { Schema, model } = require('mongoose');

const workerSchema = new Schema({
    guildId: {
      type: String,
      unique: true
    },
    guildName: {
      type: String,
    },

    userId: { 
      type: String ,
      required: true,
      unique: true,
      },

      username: { 
        type: String
      },

      firstName: {
        type: String
      },

      secondName: {
        type: String
      },

      lastName: {
        type: String
      },

      avatar: { 
        type: String 
      },
      email: { 
        type: String
      },

      password: {
        type: String,
      },

      clockDates: {
        clockIn: {
          type: [String] 
          },
        clockOut: { 
          type: [String] 
        }
      },

      afkDates: {
        afkIn: { 
          type: [String] 
        },
        afkOut: { 
          type: [String] 
        }
      },

      onLeave: {
        start: { 
          type: String
        },
        end: { 
          type: String 
        }
      },

      clockInMessage: { 
        type: String
      },

      afkMessage: { 
        type: String 
      },

      hourlyRate: {
        type: String
      },

      status: { 
        type: String, 
        required: false 
      },

      experience: { 
        type: String 
      },

      roleId: { 
        type: String 
      },

      breaksCount: { 
        type: Number, 
        default: 0 
      },

      accessToken: { 
        type: String 
      },

      refreshToken: {
        type: String 
      },

      password: {
          type: String,
      },

      role: {
        type: String 
      },

      worked: { 
        type: Number 
      },

      breakTime: {
        type: Number,
          default: 0 
      },

      dailyWorked: { 
        type: Number, 
      },

      weeklyWorked: { 
        type: Number, 
      },

      profileStatus: {
        type: String,
        default: 'Inactive'
      },

      totalWorked: { 
        type: Number, 
      },

      address: {
        type: String 
      },  

      emergencyContact: { 
        type: String 
      },

      employeeStatus: { 
        type: String 
      },

      gender: { 
        type: String 
      },

      isOwner: {
        type: Boolean,
        default: false,
    },


}, {timestamps: true});

module.exports = model("GuildWorkers", workerSchema);
