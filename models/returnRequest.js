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

        orderCode: {
            type: String,
            required: true
        },

        customerName: {
            type: String,
            default: ''
        },

        returnType: {
            type: Number,
            default:
                RETURN_TYPE.SIZE
        },

        reason: {
            type: String,
            default: ''
        },

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