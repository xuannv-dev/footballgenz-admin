var express = require('express');
var router = express.Router();

const User = require('../models/user');
const Order = require('../models/order');

const {
    applyDateRangeFilter,
    buildQueryString
} = require('../utils/adminDateFilter');

/* ================= LIST USER ================= */
router.get('/', async function (req, res, next) {

    try {

        let page = req.query.page
            ? parseInt(req.query.page)
            : 1;

        let pageSize = 8;

        let keyword = req.query.keyword || '';
        let role = req.query.role || '';

        let query = {};

        // 🔥 search email
        if (keyword.trim() !== '') {

            query.email = {
                $regex: keyword,
                $options: 'i'
            };

        }

        // 🔥 filter role
        if (role !== '') {

            query.role = role;

        }

        const dateFilter =
            applyDateRangeFilter(query, req.query);

        const queryString =
            buildQueryString(req.query, {
                page: undefined
            });

        const buildListUrl = overrides => {
            const params =
                buildQueryString(req.query, {
                    page: undefined,
                    ...overrides
                });

            return params
                ? `/admin-user?${params}`
                : '/admin-user';
        };

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize);

        const count = await User.countDocuments(query);

        res.render('partials/user/table', {

            users,

            current: page,

            pages: Math.ceil(count / pageSize),

            keyword,

            role,

            fromDate:
                dateFilter.fromDate,

            toDate:
                dateFilter.toDate,

            queryString,

            buildListUrl

        });

    } catch (err) {

        next(err);

    }

});


/* ================= DETAIL ================= */
router.get('/detail/:id', async function (req, res) {

    try {

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.send("User not found");
        }

        // 🔥 order statistics
        const orders = await Order.find({
            customer: user._id
        });

        let totalSpent = 0;

        orders.forEach(o => {

            if (o.status == 4) {
                totalSpent += o.totalprice;
            }

        });

        res.render('partials/user/detail', {

            user,

            orders,

            totalSpent

        });

    } catch (err) {

        console.log(err);

        res.send("Error");

    }

});


/* ================= ACTIVE / BLOCK ================= */
router.put('/active/:id', async function (req, res) {

    try {

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).send("User not found");
        }

        user.isActive =
            user.isActive == "true"
            ? "false"
            : "true";

        await user.save();

        res.send("Update success");

    } catch (err) {

        console.log(err);

        res.status(500).send("Update failed");

    }

});
/* =====================================================
    UPDATE AVATAR
===================================================== */
router.post('/update-avatar', async function(req, res) {
    try {
        // Lấy thông tin được gửi lên từ fetch() ở Frontend
        const { userId, avatar } = req.body;

        if (!userId || !avatar) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin người dùng hoặc link ảnh' 
            });
        }

        // 1. Cập nhật đường dẫn ảnh mới vào Database cho User đó
        await User.findByIdAndUpdate(userId, { avatar: avatar });

        // 2. Cập nhật lại ảnh trong Session hiện tại để không bị mất khi load lại trang
        // (Tuỳ thuộc vào cách bạn lưu Session đăng nhập, hãy điều chỉnh lại object cho đúng. 
        // Ví dụ: req.session.user, req.session.admin hoặc req.session.passport.user...)
        if (req.session && req.session.user) {
            req.session.user.avatar = avatar;
        }

        return res.json({ 
            success: true, 
            message: 'Cập nhật ảnh đại diện thành công' 
        });

    } catch (error) {
        console.error('Lỗi lưu avatar:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống khi cập nhật Database' 
        });
    }
});
module.exports = router;
