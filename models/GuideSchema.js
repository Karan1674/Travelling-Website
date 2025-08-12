const mongoose = require('mongoose');

const tourGuideSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    role: {
        type: String,
        required: [true, 'Role is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    image: {
        type: String,
        required: [true, 'Image is required']
    },
    socialLinks: {
        facebook: { type: String, trim: true, default: '' },
        twitter: { type: String, trim: true, default: '' },
        youtube: { type: String, trim: true, default: '' },
        instagram: { type: String, trim: true, default: '' },
        linkedin: { type: String, trim: true, default: '' }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'createdByModel',
        required: [true, 'Creator is required']
    },
    createdByModel: {
        type: String,
        required: [true, 'Creator model is required'],
        enum: ['Admin', 'Agent']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('TourGuide', tourGuideSchema);