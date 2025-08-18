const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  shortDescription: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
  },
  featureImage: {
    type: String, 
  },
  tags: [{
    type: String,
    trim: true,
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive'],
    default: 'draft',
  },
  postedOn: {
    type: Date,
    default: Date.now,
  },
  comments: [{
    name: {
      type: String,
      required: [true, 'Commenter name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Commenter email is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
    },
    postedOn: {
      type: Date,
      default: Date.now,
    },
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Creator ID is required'],
    refPath: 'createdByModel',
  },
  createdByModel: {
    type: String,
    required: [true, 'Creator model is required'],
    enum: ['Admin', 'Agent'],
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'updatedByModel',
    default: null,
  },
  updatedByModel: {
    type: String,
    enum: ['Admin', 'Agent'],
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);