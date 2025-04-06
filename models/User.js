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

const userSchema = new mongoose.Schema({
    userId: { 
        type: String, 
        unique: true, 
    },
    guildId: {
        type: String,
    },
    username: {   
        type: String,
        unique: true,
    },
    firstname: {
        type: String,
    },
    lastname: {
        type: String,
    },
    avatar: {
        type: String,
    },
    email: { 
        type: String, 
        required: false, 
        unique: true,
        sparse: true, 
     },
     
    password: {
        type: String,
    },
    role: {
        type: String, 
    },
    department: {
        type: String,
    },
    contractorStatus: {
        type: String,
    }, 
    breakTime: {
        type: Number,
        default: 0 
    },
    status: {
        type: String,
    },
    lastLogin: {
        type: Date, 
        default: Date.now 
     },
});

module.exports = mongoose.model('User', userSchema);
