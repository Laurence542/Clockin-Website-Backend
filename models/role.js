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

const roleSchema = new mongoose.Schema({
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

    name: {
        type: String,
        required: true, 
        index: true,
    },

}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);

