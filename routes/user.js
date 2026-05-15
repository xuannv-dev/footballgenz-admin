var express = require('express');
var router = express.Router();

var Order = require('../models/order');
var User = require('../models/user');

/* ================= HOME ================= */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

/* ================= PROFILE ================= */
router.get('/info', function (req, res, next) {
  let user = req.user;
  res.render('profile', { user: user });
});

/* ================= UPDATE PROFILE ================= */
router.post('/info', async function (req, res) {
  let userId = req.user._id;
  let phone = req.body.phone;
  let street = req.body.street;
  let district = req.body.district;
  let city = req.body.city;

  try {
    let user = await User.findById(userId).exec();

    user.address.city = city;
    user.address.district = district;
    user.address.street = street;
    user.phone = phone;

    await user.save();

    res.status(200).render('profile', { user: user, msg: 'success' });

  } catch (error) {
    console.log(error);
    res.status(400).render('profile', { user: req.user, msg: 'error' });
  }
});

/* ================= LIST ORDERS ================= */
router.get('/orders', async function (req, res) {
  try {
    const orders = await Order.find({
      customer: req.user._id
    }).sort({ createdAt: -1 });

    res.render('order', { orders });

  } catch (err) {
    console.log(err);
    res.send("Error");
  }
});

/* ================= ORDER DETAIL ================= */
router.get('/orders/:code', async function (req, res) {
  try {
    const code = req.params.code;

    const order = await Order.findOne({
      code: code,
      customer: req.user._id
    });

    if (!order) return res.send("Order not found");

    res.render('order-detail', { order });

  } catch (err) {
    console.log(err);
    res.send("Error");
  }
});

module.exports = router;