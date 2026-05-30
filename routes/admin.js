var express = require('express');
var router = express.Router();

const Product = require('../models/product');
const User = require('../models/user');
const Order = require('../models/order');
const News =
    require('../models/news');

const formatCurrency =
    require('../utils/formatCurrency');

/* ================= DASHBOARD ================= */

router.get('/', async function(req, res) {

    try {

        // ================= COUNT =================

        const totalProducts =
            await Product.countDocuments();

        const totalUsers =
            await User.countDocuments();

        const totalOrders =
            await Order.countDocuments();

        const totalNews =
            await News.countDocuments();

        // ================= REVENUE =================

        const completedOrders =
            await Order.find({
                status: 4
            });

        let totalRevenue = 0;

        completedOrders.forEach(order => {

            totalRevenue += order.totalprice || 0;

        });

        // ================= RENDER =================

        res.render('dashboard', {

            totalProducts,

            totalUsers,

            totalOrders,

            totalRevenue,

            totalRevenueFormatted:
                formatCurrency(totalRevenue),
            totalNews

        });

    }
    catch(err){

        console.log(err);

        res.send('Dashboard error');

    }

});

/* ================= PAYMENT MANAGEMENT ================= */

router.get('/payment/pending', function(req, res) {
    res.render('partials/payment/pending');
});

module.exports = router;