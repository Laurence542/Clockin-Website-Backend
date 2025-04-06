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

const voiceChannelSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true,
    },

    userId: {
        type: String,
        required: true,
        index: true,
      },

    channelId: {
        type: String,
        required: true, 
        index: true,
    },
    channelName: {
        type: String,
    }
    
}, { timestamps: true });

module.exports = mongoose.model('VoiceChannel', voiceChannelSchema);
