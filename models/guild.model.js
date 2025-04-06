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

const guildSchema = new Schema({
    guildId: {
        type: String,
        unique: true,
        required: true
    },
    guildName: {
        type: String,
        required: true
    },
    ownerId: { 
        type: String 
    },
    guildImage: { 
        type: String, 
        default: null 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    
}, { timestamps: true });

module.exports = model("Guild", guildSchema);
