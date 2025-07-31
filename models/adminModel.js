const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    profilePic: { type: String },
    // isAdmin: { type: String, default: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
