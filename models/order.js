const mongoose = require('mongoose');

// 👉 mapping status (dùng chung toàn project)
const ORDER_STATUS = {
    CANCELLED: 0,     // đã hủy
    RECEIVED: 1,      // đã tiếp nhận
    PREPARING: 2,     // đang chuẩn bị
    SHIPPING: 3,      // đang giao
    COMPLETED: 4      // hoàn thành
};

// 👉 payment status
const PAYMENT_STATUS = {
    PENDING: 'pending',           // chờ xác nhận
    AWAITING: 'awaiting_payment', // chờ thanh toán
    VERIFIED: 'verified',         // đã xác nhận
    CONFIRMED: 'confirmed',        // đã confirm bởi admin
    REJECTED: 'rejected'          // đã bị từ chối
};

const OrderSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
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
        productname: String,
        image: {
            type: String,
            default: ""
        },
        price: {
            type: Number,
            required: true
        },
        size: String,
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
    },

    paymentStatus: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING
    },
    // Lý do từ chối thanh toán
    rejectionReason: {
        type: String,
        default: ''
    },
    paymentRejectedAt: Date,
    paymentRejectedBy: String,
    paymentVerifications: [{
        amount: Number,
        verifiedAt: Date,
        verifiedBy: String,
        proof: String,
        note: String
    }],

    paymentConfirmedAt: Date,
    paymentConfirmedBy: String

}, { timestamps: true });

module.exports = mongoose.model('order', OrderSchema);
module.exports.ORDER_STATUS = ORDER_STATUS;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;