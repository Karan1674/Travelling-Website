const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    number: { type: String },
    message: { type: String, required: true },
    questionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    questionAt: { type: Date, default: Date.now },
    answer: { type: String, default: null },
    answeredBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        refPath: 'answeredByModel', 
        default: null 
    },
    answeredByModel: { 
        type: String, 
        enum: ['Admin', 'Agent'], 
        default: null 
    },
    answeredAt: { type: Date, default: null }
},{timestamps:true});

module.exports = mongoose.model('FAQ', faqSchema);


