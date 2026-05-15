var express = require('express');
var router = express.Router();

const User = require('../models/user');
const Order = require('../models/order');

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

            role

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

module.exports = router;