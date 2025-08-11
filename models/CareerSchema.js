const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true,
        maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    employmentType: {
        type: String,
        required: [true, 'Employment type is required'],
        enum: ['Full Time', 'Part Time', 'Full Time / Part Time'],
        default: 'Full Time'
    },
    shortDescription: {
        type: String,
        required: [true, 'Short description is required'],
        trim: true,
        maxlength: [200, 'Short description cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Job description is required'],
        trim: true
    },
    overview: {
        type: String,
        required: [true, 'Overview is required'],
        trim: true
    },
    experience: {
        type: String,
        required: [true, 'Experience is required'],
        trim: true
    },
    requirements: {
        type: String,
        required: [true, 'Requirements are required'],
        trim: true
    },
    vacancies: {
        type: Number,
        required: [true, 'Number of vacancies is required'],
        min: [1, 'Number of vacancies must be at least 1'],
        default: 1
    },
    salary: {
        type: String,
        required: [true, 'Salary information is required'],
        trim: true,
        default: 'Negotiable'
    },
    image: {
        type: String,
        required: [true, 'Career image is required'],
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Creator ID is required'],
        refPath: 'createdByModel'
    },
    createdByModel: {
        type: String,
        required: [true, 'Creator model is required'],
        enum: ['Admin', 'Agent']
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

module.exports = mongoose.model('Career', careerSchema);