const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    group: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: [String],
        required: true,
        default: []
    },
    description: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('category', CategorySchema);