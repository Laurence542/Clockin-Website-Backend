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

const taskSchema = new Schema({
    guildId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true, 
    },
    createdBy: {
        type:String,
    },
    assignedTo: { 
        type: Schema.Types.ObjectId, 
        ref: 'Worker' 
    },

    headline: {
        type: String,
    },
    description: {
        type: String, 
    },
    dueDate: {
        type: String,
    },
    priority: {
        type: String,
    },
    status: {
        type: String,
    },
  
 }, { timestamps: true });


module.exports = model('Tasks', taskSchema);


























// const { Schema, model } = require('mongoose');

// const taskSchema = new Schema({
//     guildId: {
//         type: String,
//         required: true,
//     },
//     workers: [
//         {
//             userId: {
//                 type: String,
//                 required: true, 
//             },
//             headline: {
//                 type: String,
//             },
//             description: {
//                 type: String, 
//             },
//             dueDate: {
//                 type: String,
//             },
//             priority: {
//                 type: String,
//             },
//             status: {
//                 type: String,
//             },
//         },
//     ],
// }, { timestamps: true });


// module.exports = model('Tasks', taskSchema);
