const mongoose = require('mongoose');

// 👉 mapping status (dùng chung toàn project)
const ORDER_STATUS = {
    CANCELLED: 0,     // đã hủy
    RECEIVED: 1,      // đã tiếp nhận
    PREPARING: 2,     // đang chuẩn bị
    SHIPPING: 3,      // đang giao
    COMPLETED: 4      // hoàn thành
};

const OrderSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },

    totalprice: {
        type: Number,
        required: true,
        default: 0
    },

    note: {
        type: String,
        default: ""
    },

    products: [{
        productCode: {
            type: String,
            required: true
        },
        name: String,
        price: {
            type: Number,
            required: true
        },
        color: String,
        quantity: {
            type: Number,
            required: true
        }
    }],

    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },

    receiver: {
        type: String,
        default: ""
    },

    phoneContact: {
        type: String,
        default: ""
    },

    creator: String,

    addressShip: {
        type: String,
        required: true
    },

    typePay: {
        type: Number, // 0: COD, 1: chuyển khoản
        default: 0
    },

    status: {
        type: Number,
        enum: Object.values(ORDER_STATUS),
        default: ORDER_STATUS.RECEIVED
    }

}, { timestamps: true });

module.exports = mongoose.model('order', OrderSchema);
module.exports.ORDER_STATUS = ORDER_STATUS;