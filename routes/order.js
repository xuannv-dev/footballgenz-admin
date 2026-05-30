var express = require('express');
var router = express.Router();

const Order = require('../models/order');
const Product = require('../models/product');

const { ORDER_STATUS, PAYMENT_STATUS } =
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

        /* =====================================================
            DECREASE STOCK
        ===================================================== */

        const products = Array.isArray(req.body.products)
            ? req.body.products
            : [req.body.products];

        for (const item of products) {

            await Product.updateOne(
                {
                    productCode: item.productCode,
                    variants: {
                        $elemMatch: {
                            size: item.size,
                            color: item.color
                        }
                    }
                },
                {
                    $inc: { 'variants.$.stock': -Number(item.quantity) }
                }
            );

        }

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
    ORDER STATS
===================================================== */

router.get('/stats', async function(req, res) {

    try {

        const type = req.query.type || 'day';
        const now  = new Date();

        let from, to, groupBy, labelFn;

        if (type === 'week') {

            // Thứ 2 đầu tuần hiện tại
            const day = now.getDay() || 7;
            from = new Date(now);
            from.setDate(now.getDate() - day + 1);
            from.setHours(0, 0, 0, 0);
            to = new Date();

            groupBy = {
                week: { $isoWeek: '$createdAt' },
                year: { $isoWeekYear: '$createdAt' }
            };

        } else if (type === 'month') {

            from = new Date(now.getFullYear(), 0, 1);
            to   = new Date();

            groupBy = {
                month: { $month: '$createdAt' },
                year:  { $year:  '$createdAt' }
            };

        } else if (type === 'range') {

            from = req.query.from ? new Date(req.query.from) : new Date(now.setDate(now.getDate() - 29));
            to   = req.query.to   ? new Date(req.query.to)   : new Date();
            to.setHours(23, 59, 59, 999);

            groupBy = {
                day:   { $dayOfMonth: '$createdAt' },
                month: { $month:      '$createdAt' },
                year:  { $year:       '$createdAt' }
            };

        } else {

            // Mặc định: 7 ngày gần nhất
            from = new Date();
            from.setDate(from.getDate() - 6);
            from.setHours(0, 0, 0, 0);
            to = new Date();

            groupBy = {
                day:   { $dayOfMonth: '$createdAt' },
                month: { $month:      '$createdAt' },
                year:  { $year:       '$createdAt' }
            };

        }

        const rawData = await Order.aggregate([
            {
                $match: {
                    status: 4,
                    createdAt: { $gte: from, $lte: to }
                }
            },
            {
                $group: {
                    _id: groupBy,
                    revenue:    { $sum: '$totalprice' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
        ]);

        // Tổng trong khoảng
        const summary = rawData.reduce(
            (acc, row) => {
                acc.revenue    += row.revenue;
                acc.orderCount += row.orderCount;
                return acc;
            },
            { revenue: 0, orderCount: 0 }
        );

        const formatCurrency = require('../utils/formatCurrency');

        res.render('partials/order/stats', {
            type,
            from:  req.query.from  || '',
            to:    req.query.to    || '',
            rawData,
            summary,
            formatCurrency
        });

    } catch(err) {

        console.log(err);
        res.send('Error loading stats');

    }

});

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

/* =====================================================
    PAYMENT VERIFICATION - LIST PENDING
===================================================== */

router.get('/payment/pending', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const pageSize = 10;
        const skip = (page - 1) * pageSize;

        const orders = await Order.find({
            typePay: 1,
            paymentStatus: { $in: [PAYMENT_STATUS.AWAITING, PAYMENT_STATUS.VERIFIED] }
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize);

        const total = await Order.countDocuments({
            typePay: 1,
            paymentStatus: { $in: [PAYMENT_STATUS.AWAITING, PAYMENT_STATUS.VERIFIED] }
        });

        res.json({
            success: true,
            orders,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (error) {
        console.error('[PAYMENT PENDING]', error);
        res.status(500).json({ success: false, message: 'Lỗi' });
    }
});

/* =====================================================
    PAYMENT VERIFICATION - CONFIRM PAYMENT
===================================================== */

router.post('/payment/confirm/:orderCode', async (req, res) => {
    try {
        const { orderCode } = req.params;
        const { note } = req.body;

        const order = await Order.findOne({ code: orderCode });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        if (order.typePay !== 1) {
            return res.status(400).json({ success: false, message: 'Đơn hàng này không dùng chuyển khoản' });
        }

        // Update payment status
        order.paymentStatus = PAYMENT_STATUS.CONFIRMED;
        order.paymentConfirmedAt = new Date();
        order.paymentConfirmedBy = req.session.passport?.user || 'admin';

        await order.save();

        res.json({
            success: true,
            message: 'Đã xác nhận thanh toán',
            paymentStatus: order.paymentStatus
        });
    } catch (error) {
        console.error('[CONFIRM PAYMENT]', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xác nhận' });
    }
});

/* =====================================================
    PAYMENT VERIFICATION - REJECT PAYMENT
===================================================== */

router.post('/payment/reject/:orderCode', async (req, res) => {
    try {
        const { orderCode } = req.params;
        const { reason } = req.body;

        const order = await Order.findOne({ code: orderCode });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        // Reset to awaiting
        order.paymentStatus = PAYMENT_STATUS.AWAITING;
        order.paymentVerifications = [];
        order.note = (order.note || '') + `\n[REJECTED] ${reason || 'Không có lý do'}`;

        await order.save();

        res.json({
            success: true,
            message: 'Đã từ chối xác nhận thanh toán',
            paymentStatus: order.paymentStatus
        });
    } catch (error) {
        console.error('[REJECT PAYMENT]', error);
        res.status(500).json({ success: false, message: 'Lỗi' });
    }
});

/* =====================================================
    PAYMENT VERIFICATION - GET ORDER DETAILS
===================================================== */

router.get('/payment/details/:orderCode', async (req, res) => {
    try {
        const { orderCode } = req.params;

        const order = await Order.findOne({ code: orderCode });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        res.json({
            success: true,
            order: {
                code: order.code,
                totalprice: order.totalprice,
                receiver: order.receiver,
                phoneContact: order.phoneContact,
                addressShip: order.addressShip,
                paymentStatus: order.paymentStatus,
                paymentVerifications: order.paymentVerifications,
                createdAt: order.createdAt,
                products: order.products
            }
        });
    } catch (error) {
        console.error('[PAYMENT DETAILS]', error);
        res.status(500).json({ success: false, message: 'Lỗi' });
    }
});

module.exports = router;