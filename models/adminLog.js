// models/adminLog.js

const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({

    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },

    action: {
        type: String,
        required: true
    },

    targetType: {
        type: String
    },

    targetId: {
        type: String
    },

    description: {
        type: String
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    'AdminLog',
    adminLogSchema
);