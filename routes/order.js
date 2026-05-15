var express = require('express');
var router = express.Router();

const Order = require('../models/order');
const Product = require('../models/product');

const { ORDER_STATUS } =
    require('../models/order');

/* =====================================================
    ORDER STATUS FLOW
===================================================== */

const ALLOWED_TRANSITIONS = {

    // Chờ xác nhận
    1: [2, 0],

    // Đang chuẩn bị
    2: [3, 0],

    // Đang giao
    3: [4],

    // Hoàn thành
    4: [],

    // Đã hủy
    0: []

};

/* =====================================================
    LIST ORDER
===================================================== */

router.get('/', async function(req, res, next) {

    try {

        let page =
            req.query.page
                ? parseInt(req.query.page)
                : 1;

        const pageSize = 6;

        const status =
            req.query.status;

        const code =
            req.query.code;

        let query = {};

        // ================= FILTER STATUS =================

        if(
            status !== undefined
            &&
            status !== ''
        ){

            query.status =
                parseInt(status);

        }

        // ================= SEARCH CODE =================

        if(
            code
            &&
            code.trim() !== ''
        ){

            query.code = {

                $regex:
                    code.trim(),

                $options: 'i'

            };

        }

        // ================= GET DATA =================

        const orders =
            await Order.find(query)

                .populate('customer')

                .sort({
                    createdAt: -1
                })

                .skip(
                    (page - 1)
                    * pageSize
                )

                .limit(pageSize);

        const count =
            await Order.countDocuments(query);

        // ================= RENDER =================

        res.render(
            'partials/order/table',
            {

                orders,

                current: page,

                pages:
                    Math.ceil(
                        count / pageSize
                    ),

                selectedStatus:
                    status,

                searchCode:
                    code

            }
        );

    }
    catch(err){

        next(err);

    }

});

/* =====================================================
    ADD PAGE
===================================================== */

router.get('/add', async function(req, res){

    try{

        const products =
            await Product.find({
                isActive: true
            });

        res.render(
            'partials/order/add',
            { products }
        );

    }
    catch(err){

        console.log(err);

        res.send(
            'Load add order failed'
        );

    }

});

/* =====================================================
    CREATE ORDER
===================================================== */

router.post('/add', async function(req, res){

    try{

        const order =
            new Order({

                code:
                    getRandomString(6),

                totalprice:
                    req.body.totalprice,

                note:
                    req.body.note,

                products:
                    req.body.products,

                customer:
                    req.body.user,

                addressShip:
                    req.body.addressShip,

                typePay:
                    req.body.typePay,

                status:
                    ORDER_STATUS.RECEIVED

            });

        await order.save();

        res.send(
            'Create order success!'
        );

    }
    catch(err){

        console.log(err);

        res.status(500)
            .send(
                'Create order failed!'
            );

    }

});

/* =====================================================
    DETAIL
===================================================== */

router.get(
    '/detail/:code',
    async function(req, res){

        try{

            const code =
                req.params.code;

            const order =
                await Order.findOne({
                    code
                })

                .populate('customer');

            if(!order){

                return res.send(
                    'Order not found'
                );

            }

            res.render(
                'partials/order/detail',
                { order }
            );

        }
        catch(err){

            console.log(err);

            res.send('Error');

        }

    }
);

/* =====================================================
    UPDATE STATUS
===================================================== */

router.put(
    '/update/:code',
    async function(req, res){

        try{

            const code =
                req.params.code;

            const newStatus =
                parseInt(
                    req.body.status
                );

            const order =
                await Order.findOne({
                    code
                });

            // ================= NOT FOUND =================

            if(!order){

                return res.status(404)
                    .send(
                        'Order not found'
                    );

            }

            const currentStatus =
                order.status;

            // ================= VALIDATE FLOW =================

            const allowed =
                ALLOWED_TRANSITIONS[
                    currentStatus
                ] || [];

            if(
                !allowed.includes(
                    newStatus
                )
            ){

                return res.status(400)
                    .send(
                        'Không thể cập nhật trạng thái không hợp lệ!'
                    );

            }

            // ================= UPDATE =================

            order.status =
                newStatus;

            await order.save();

            res.send(
                'Update success'
            );

        }
        catch(err){

            console.log(err);

            res.status(500)
                .send(
                    'Update failed'
                );

        }

    }
);

/* =====================================================
    HELPER
===================================================== */

function getRandomString(length){

    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    let result = '';

    for(
        let i = 0;
        i < length;
        i++
    ){

        result += chars.charAt(

            Math.floor(
                Math.random()
                * chars.length
            )

        );

    }

    return result;

}

module.exports = router;