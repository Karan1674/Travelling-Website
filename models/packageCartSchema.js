const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
            quantity: { type: Number, default: 1 }
        }
    ],
    createdAt: { type: Date, default: Date.now }
},{timestamps:true});

module.exports = mongoose.model('Cart', cartSchema);
