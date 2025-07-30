const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    groupSize: { type: Number, required: true },
    tripDuration: {
        days: { type: Number, required: true },
        nights: { type: Number, required: true },
    },
    category: { type: String, enum: ['Adult', 'Child', 'Couple'], required: true },
    regularPrice: { type: String, required: true },
    salePrice: { type: String },
    discount: { type: String },
    gallery: [{ type: String }], // Array of image filenames (max 8)
    featuredImage: { type: String }, // Single featured image filename
    location: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
    },
    keywords: [{ type: String }],
    additionalCategories: [{ type: String }],
    departure: {
        location: { type: String, required: true },
        dateTime: { type: Date, required: true },
    },
    itinerary: {
        title: { type: String, default: 'Program' },
        duration: { type: String }, // e.g., "7 days"
        description: { type: String },
        days: [{
            dayNumber: { type: Number },
            title: { type: String },
            description: { type: String },
        }],
    },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    status: { type: String, enum: ['Active', 'Pending', 'Expired'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Package', PackageSchema);