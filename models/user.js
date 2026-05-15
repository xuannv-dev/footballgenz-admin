const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    firstname: String,
    lastname: String,

    role: { type: String, default: 'USER' },
    isActive: {
        type: String,
        default: "true"
    },
    phone: { type: String, default: "" },

    address: {
        country: { type: String, default: "" },
        city: { type: String, default: "" },
        zipcode: { type: String, default: "" },
        district: { type: String, default: "" },
        street: { type: String, default: "" }
    },

    shippingAddress: {
        city: { type: String, default: "" },
        zipcode: { type: String, default: "" },
        district: { type: String, default: "" },
        street: { type: String, default: "" }
    },

    cart: [{
        productCode: String,
        productname: String,
        quantity: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
        image: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('user', UserSchema);