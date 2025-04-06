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

const mongoose = require('mongoose');

const timeOffRequestSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
    },
    userId: { 
        type: String, 
        required: true
        },
    startDate: {
        type: Date, 
        required: true 
    },
    endDate: {
        type: Date, 
        required: true 
    },
    reason: {
        type: String, 
        required: true 
    },
    status: { 
        type: String,
        required: true
    },
    note: { 
        type: String 
    },
    submittedAt: {
        type: Date,
        default: Date.now 
    }
  
}, { timestamps: true }); 

module.exports = mongoose.model('TimeOffRequest', timeOffRequestSchema);
