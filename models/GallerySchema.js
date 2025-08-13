const mongoose = require('mongoose');
const gallerySchema = new mongoose.Schema({
    image: { type: String, required: true },
    title: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel' },
    createdByModel: { type: String, enum: ['User', 'Admin'], required: true },
    createdAt: { type: Date, default: Date.now },
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

module.exports = mongoose.model('Gallery', gallerySchema);

