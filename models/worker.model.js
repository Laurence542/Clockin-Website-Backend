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
    required: true, 
    index: true,
    ref: 'Guild' 
  },
  authToken: { 
    type: String 
  },
  selectedGuild: { 
    type: String 
  },
  userId: { 
    type: String, 
    required: true, 
    unique: true 
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
    type: String,
    default: null 
  },
  email: { 
    type: String, 
    unique: true 
  },
  password: { 
    type: String
   
  },
  clockDates: {
    breaks: [
      {
        breakStart: Date,
        breakEnd: Date,
      }
    ]
  },
  
  clockInTime: { 
    type: Date, 
    default: null
  }, 
  isTimerPaused: { 
    type: Boolean, 
    default: false 
  }, 
  pauseStartTime: { 
    type: Date, 
    default: null 
  }, 
  accumulatedPauseDuration: { 
    type: Number, 
    default: 0 
  }, 
  afkDates: {
    afkIn: [Date],
    afkOut: [Date]
  },
  onLeave: {
    start: Date,
    end: Date
  },
  clockInMessage: { 
    type: String 
  },
  afkMessage: { 
    type: String
  },
  hourlyRate: { 
    type: Number 
  },
  status: { 
    type: String 
  },
  experience: {
     type: String 
  },
  employeeType: {
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
  role: { 
    type: String 
  },
  worked: { 
    type: Number, 
    default: 0 
  },
  breakTime: { 
    type: Number, 
    default: 0 
  },
  dailyWorked: { 
    type: Number, 
    default: 0 
  },
  weeklyWorked: { 
    type: Number, 
    default: 0 
  },
  profileStatus: { 
    type: String,
    default: 'Inactive'
  },
  
  totalWorked: { 
    type: Number, 
    default: 0 
  },
  address: { 
    type: String 
  },
  emergencyContact: { 
    type: String 
  },
  streetName: {
    type: String
  },
  city: {
    type: String
  },
  county: {
    type: String
  },
  country: {
    type: String
  },
  mobilePhone: {
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
    default: false
 }

}, { timestamps: true });

module.exports = model("Worker", workerSchema);
