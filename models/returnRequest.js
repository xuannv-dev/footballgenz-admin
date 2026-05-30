const mongoose =
    require('mongoose');

const RETURN_STATUS = {

    PENDING: 1,

    APPROVED: 2,

    REJECTED: 3,

    COMPLETED: 4

};

const RETURN_TYPE = {

    SIZE: 1,

    DEFECT: 2,

    WRONG_PRODUCT: 3,

    REFUND: 4

};

const ReturnRequestSchema =
    new mongoose.Schema({

        // ================= ORDER =================

        orderCode: {

            type: String,

            required: true

        },

        // ================= CUSTOMER =================

        customerId: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: 'user'

        },

        customerName: {

            type: String,

            default: ''

        },

        // ================= PRODUCT SNAPSHOT =================

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

        quantity: {

            type: Number,

            default: 1

        },

        price: {

            type: Number,

            default: 0

        },

        // ================= RETURN =================

        returnType: {

            type: Number,

            default:
                RETURN_TYPE.SIZE

        },

        reason: {

            type: String,

            default: ''

        },

        evidenceImages: [{

            type: String

        }],

        // ================= ADMIN =================

        adminNote: {

            type: String,

            default: ''

        },

        status: {

            type: Number,

            default:
                RETURN_STATUS.PENDING

        }

    }, {

        timestamps: true

    });

module.exports = {

    ReturnRequest:
        mongoose.model(
            'returnRequest',
            ReturnRequestSchema
        ),

    RETURN_STATUS,

    RETURN_TYPE

};