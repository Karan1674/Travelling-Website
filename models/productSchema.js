const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    shortDescription: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        min: 0
    },
    discountPrice: {
        type: Number,
        min: 0
    },
    isOnSale: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'discontinued', 'draft'],
        default: 'draft'
    },
    images: [{
        type: String,
        trim: true
    }],
    featureImage: {
        type: String,
        trim: true
    },
    categories: [{
        type: String,
        trim: true
    }],
    tags: [{
        type: String,
        trim: true
    }],
    description: {
        type: String,
        trim: true
    },
    additionalInfo: {
        weight: { type: String, trim: true },
        dimensions: { type: String, trim: true }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'createdByModel',
        required: true
    },
    createdByModel: {
        type: String,
        required: true,
        enum: ['Admin', 'Agent']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'updatedByModel'
    },
    updatedByModel: {
        type: String,
        enum: ['Admin', 'Agent']
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);