const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    careerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Career',
        required: [true, 'Career ID is required']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    cvFileName: {
        type: String,
        required: [true, 'CV file name is required'],
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    appliedAt: {
        type: Date,
        default: Date.now
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
    updatedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);