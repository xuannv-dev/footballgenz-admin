const mongoose = require('mongoose');

// Variant schema (size + color + stock)
const VariantSchema = new mongoose.Schema({
    size: {
        type: Number,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    }
}, { _id: false }); // không cần _id cho từng variant

// Product schema
const ProductSchema = new mongoose.Schema({
    productCode: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    brand: {
        type: String,
        default: ""
    },
    group: {
        type: String,
        default: "GIAY"
    },
    images: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },

    // 🔥 QUAN TRỌNG
    variants: [VariantSchema]

}, { timestamps: true });

module.exports = mongoose.model('product', ProductSchema);