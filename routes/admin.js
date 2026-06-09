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
        // ===== 1. CÁC CHỈ SỐ KPI =====
        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalCustomers = await User.countDocuments({ role: 'USER' });
        const totalUsers = await User.countDocuments();
        const totalNews = await News.countDocuments();

        // ===== 2. TỔNG DOANH THU (Chỉ tính đơn hoàn thành - status 4) =====
        const revenueData = await Order.aggregate([
            { $match: { status: 4 } },
            { $group: { _id: null, total: { $sum: "$totalprice" } } }
        ]);
        const totalRevenue = revenueData.length ? revenueData[0].total : 0;

        // ===== 3. ĐƠN HÀNG HÔM NAY =====
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = await Order.countDocuments({
            createdAt: { $gte: today }
        });

        // ===== 4. THỐNG KÊ DOANH THU 7 NGÀY GẦN NHẤT =====
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
                _id: { day, month },
                total: found ? found.total : 0
            });
        }

        // ===== 5. DOANH THU THEO THÁNG =====
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

        // ===== 6. SẢN PHẨM SẮP HẾT HÀNG (Stock <= 5) =====
        const lowStockProducts = await Product.find({
            "variants.stock": { $lte: 5 }
        }).limit(5);

        // ===== 7. TOP 5 SẢN PHẨM BÁN CHẠY =====
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

        // ===== 8. ĐƠN HÀNG MỚI NHẤT =====
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5);

        // ================= RENDER =================
        res.render('dashboard', {
            totalProducts,
            totalUsers,
            totalOrders,
            totalRevenue,
            totalRevenueFormatted: formatCurrency(totalRevenue),
            todayOrders,
            last7Days,
            monthlyRevenue,
            totalCustomers, // Trả về thông tin khách hàng (USER) thay vì tất cả Users
            totalNews,
            lowStockProducts,
            topSelling,
            recentOrders
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