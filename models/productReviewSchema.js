// models/Review.js
const mongoose = require('mongoose');

const productReviewSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    comment: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    date: { type: Date, default: Date.now },
    replies: [
        {
            name: { type: String, required: true, trim: true },
            email: { type: String, required: true, trim: true },
            comment: { type: String, required: true, trim: true },
            date: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('productReview', productReviewSchema);