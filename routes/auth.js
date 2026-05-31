var express = require('express');
var router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const User = require('../models/user');

//GET LOGIN, SIGNUP PAGE
router.get('/', function (req, res) {
    res.redirect('/auth/login');
});

router.get('/login', function (req, res) {
    res.render('login', { layout: false });
});
router.post(
    '/login',
    passport.authenticate('local', {
        failureRedirect: '/auth/login',
        failureFlash: true,
    }),
    function (req, res) {
        if (req.body.rememberme) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        } else {
            req.session.cookie.expires = false;
        }
        console.log('loggedIn');
        res.redirect('/admin');
    }
);

router.get('/register', function (req, res) {
    res.render('register', { layout: false });
});

router.post('/register', async function (req, res) {
    try {
        const { firstname, lastname, email, password, confirmPassword } = req.body;

        // Kiểm tra mật khẩu khớp nhau
        if (password !== confirmPassword) {
            return res.render('register', { layout: false, message: 'Mật khẩu xác nhận không khớp!' });
        }

        // Kiểm tra email đã tồn tại chưa
        const userExists = await User.findOne({ email: email });
        if (userExists) {
            return res.render('register', { layout: false, message: 'Email này đã được sử dụng!' });
        }

        // Mã hóa mật khẩu và tạo user mới
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            role: 'ADMIN' // Mặc định đăng ký từ đây là quyền ADMIN
        });

        await user.save();
        res.redirect('/auth/login');
    } catch (error) {
        console.log(error);
        res.render('register', { layout: false, message: 'Có lỗi xảy ra trong quá trình đăng ký!' });
    }
});

router.get('/logout', function (req, res) {
    req.logOut();
    res.redirect('/');
});
module.exports = router;
