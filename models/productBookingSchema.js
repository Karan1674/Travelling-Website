const mongoose = require('mongoose');

const productBookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, default: 1, min: [1, 'Quantity must be at least 1'] },
        price: { type: Number, required: true } // Store price at booking time
    }],
    userDetails: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        country: { type: String, required: true },
        streetAddress: { type: String, required: true },
        streetAddressOptional: { type: String },
        city: { type: String, required: true },
        province: { type: String, required: true },
        postcode: { type: String, required: true },
        notes: { type: String }
    },
    payment: {
        paymentMethod: { type: String, enum: ['bank', 'check', 'cod', 'stripe'], required: true },
        stripePaymentIntentId: { type: String }, // Only for stripe payments
        paymentStatus: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
        paymentType: { type: String, enum: ['deposit', 'refund', 'notReceived'], default: 'notReceived' }
    },
    status: {
        type: String,
        enum: ['approved', 'pending', 'rejected'],
        default: 'pending',
        required: true
    },
    total: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
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

}, { timestamps: true });

module.exports = mongoose.model('ProductBooking', productBookingSchema);