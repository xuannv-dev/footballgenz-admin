const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    slug: {
        type: String,
        required: true,
        unique: true
    },

    thumbnail: {
        type: String,
        default: ''
    },

    description: {
        type: String,
        default: ''
    },

    content: {
        type: String,
        default: ''
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

module.exports =
    mongoose.model(
        'news',
        NewsSchema
    );