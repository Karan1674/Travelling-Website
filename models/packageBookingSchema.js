const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
        quantity: { type: Number, default: 1, min: [1, 'Quantity must be at least 1'] },
        price: { type: Number, required: true } // Store price at booking time
    }],
    userDetails: {
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        country: { type: String, required: true },
        street_1: { type: String, required: true },
        street_2: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postal_code: { type: String, required: true },
        notes: { type: String }
    },
    payment: {
        stripePaymentIntentId: { type: String, required: true },
        paymentStatus: { type: String, required: true, enum: ['pending', 'succeeded', 'failed'] },
        paymentType: { type: String, enum: ['deposit', 'refund'], default: 'deposit', required: true }
    },
    status: {
        type: String,
        enum: ['approved', 'pending', 'rejected'],
        default: 'pending',
        required: true
    },
    total: { type: Number, required: true },
    discount: { type: Number, default: 0 }, // Added discount field
    couponCode: { type: String, default: null }, // Added coupon code field
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);