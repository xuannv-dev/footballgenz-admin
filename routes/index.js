var express = require('express');
var router = express.Router();
const Product = require('../models/product');
const User = require('../models/user');
const formatCurrency =
    require('../utils/formatCurrency');

/* GET home page. */
router.get('/', async function (req, res, next) {
    try {
        const Order = require('../models/order');

        // ===== BASIC =====
        const totalOrders = await Order.countDocuments();

        const revenueData = await Order.aggregate([
            { $match: { status: 4 } },
            { $group: { _id: null, total: { $sum: "$totalprice" } } }
        ]);

        const totalRevenue = revenueData.length ? revenueData[0].total : 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = await Order.countDocuments({
            createdAt: { $gte: today }
        });

        // ===== 7 NGÀY =====
        // ===== 7 NGÀY =====

        const raw7Days = await Order.aggregate([
            {
                $match: {
                    status: 4,
                    createdAt: {
                        $gte: new Date(new Date().setDate(new Date().getDate() - 6))
                    }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    total: { $sum: "$totalprice" }
                }
            }
        ]);

        // Tạo đủ 7 ngày
        let last7Days = [];

        for (let i = 6; i >= 0; i--) {

            const d = new Date();
            d.setDate(d.getDate() - i);

            const day = d.getDate();
            const month = d.getMonth() + 1;

            const found = raw7Days.find(item =>
                item._id.day === day &&
                item._id.month === month
            );

            last7Days.push({
                _id: {
                    day,
                    month
                },
                total: found ? found.total : 0
            });
        }

        // ===== THEO THÁNG =====
        const monthlyRevenue = await Order.aggregate([
            { $match: { status: 4 } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" } },
                    total: { $sum: "$totalprice" }
                }
            },
            { $sort: { "_id.month": 1 } }
        ]);
        console.log("7 DAYS:", last7Days);
        console.log("MONTH:", monthlyRevenue);
        // ===== TOTAL PRODUCT =====
        const totalProducts = await Product.countDocuments();

        // ===== TOTAL CUSTOMER =====
        const totalCustomers = await User.countDocuments({
            role: 'USER'
        });

        // ===== LOW STOCK =====
        const lowStockProducts = await Product.find({
            "variants.stock": { $lte: 5 }
        }).limit(5);

        // ===== TOP SELLING =====
        const topSelling = await Order.aggregate([
            { $match: { status: 4 } },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.productCode",
                    sold: { $sum: "$products.quantity" }
                }
            },
            { $sort: { sold: -1 } },
            { $limit: 5 }
        ]);
        // ===== RECENT ORDERS =====
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5);
        res.render('index', {
            totalOrders,
            totalRevenue,
            todayOrders,
            last7Days,
            monthlyRevenue,
            totalProducts,
            totalCustomers,
            lowStockProducts,
            topSelling,
            recentOrders
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router;
