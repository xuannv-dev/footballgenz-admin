const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({

    // ===== ORDER =====

    orderCode: {
        type: String,
        required: true
    },

    // ===== CUSTOMER =====

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },

    customerName: {
        type: String,
        default: ''
    },

    // ===== PRODUCT SNAPSHOT =====

    productCode: {
        type: String,
        required: true
    },

    productname: {
        type: String,
        default: ''
    },

    image: {
        type: String,
        default: ''
    },

    size: {
        type: String,
        default: ''
    },

    color: {
        type: String,
        default: ''
    },

    // ===== REVIEW =====

    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },

    comment: {
        type: String,
        default: ''
    },

    // ===== ADMIN =====

    adminNote: {
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
        'review',
        ReviewSchema
    );