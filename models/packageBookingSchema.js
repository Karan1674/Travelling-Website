const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
        quantity: { type: Number, default: 1 }
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
        paymentStatus: { type: String, required: true, enum: ['pending', 'succeeded', 'failed'] }
    },
    total: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);