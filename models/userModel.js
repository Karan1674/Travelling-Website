const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName:    { type: String, required: true },
  lastName:     { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  countryCode:        { type: String, required: true},
  phone:        { type: String, required: true},
  dateOfBirth:  { type: Date },
  country:      { type: String },
  state:        { type: String },
  city:         { type: String },
  address:      { type: String },
  description:  { type: String },
  profilePic:   { type: String },
listing:{type:Number, default:0},
  admin:        { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
