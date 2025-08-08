const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  packageType: { type: String, enum: ['Adventure', 'Cultural', 'Luxury', 'Family', 'Wellness', 'Eco'] },
  groupSize: { type: Number },
  tripDuration: {
    days: { type: Number },
    nights: { type: Number }
  },
  category: { type: String, enum: ['Adult', 'Child', 'Couple'] },
  regularPrice: { type: Number },
  salePrice: { type: Number },
  discount: { type: Number },
  multipleDepartures: [{
    location: { type: String },
    dateTime: { type: Date }
  }],
  itineraryDescription: { type: String },
  itineraryDays: [{
    day: { type: Number },
    activities: [{
      title: { type: String },
      sub_title: { type: String },
      start_time: { type: String },
      end_time: { type: String },
      type: { type: String }
    }]
  }],
  programDescription: { type: String },
  programDays: [{
    day: { type: Number },
    title: { type: String },
    description: { type: String }
  }],
  inclusions: [{ type: String }],
  exclusions: [{ type: String }],
  activityTypes: [{ type: String }],
  highlights: [{ type: String }],
  additionalCategories: [{ type: String }],
  keywords: [{ type: String }],
  quote: { type: String },
  difficultyLevel: { type: String, enum: ['Easy', 'Moderate', 'Challenging'] },
  latitude: { type: Number },
  longitude: { type: Number },
  destinationAddress: { type: String },
  destinationCountry: { type: String },
  gallery: [{ type: String }],
  featuredImage: { type: String },
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
  status: { type: String, enum: ['Pending', 'Active', 'Expired'], required: true },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema);