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


const {Schema, model } = require('mongoose');

const selectedGuildSchema = new  Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
    },
    guildId: {
        type: String,
        required: true,
    },

},{timestamps: true});

module.exports = model("selectedGuild", selectedGuildSchema);
