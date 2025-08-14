const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    number: { type: String },
    message: { type: String, required: true },
    enquiryStatus: { 
        type: String, 
        enum: ['pending', 'active', 'cancel'], 
        default: 'pending' 
    },
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        refPath: 'updatedByModel', 
        default: null 
    },
    updatedByModel: { 
        type: String, 
        enum: ['Admin', 'Agent'], 
        default: null 
    },
    updatedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
},{timestamps:true});

module.exports = mongoose.model('Contact', contactSchema);