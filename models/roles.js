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

const roleSchema = new Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    roles: [
        {
            name: {
                type: String,
                required: true
            },
            hourlySalary: {
                type: Map,
                of: Number
            },
            category: {
                type: String,
                required: true
            },
            id: {
                type: String,
                required: true
            }
        }
    ],
    categorys: {
        type: [String]
    },
    experiences: {
        type: [String],
        default: ["Trial", "Junior", "Mid", "Senior"]
    }
});

module.exports = model("Roles", roleSchema);