var express = require('express');
var router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/user');

// Helper: Gửi email cho Admin
const sendAdminEmail = async (to, subject, bodyHtml) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    await transporter.sendMail({
        from: '"FootballGenz Admin" <' + process.env.EMAIL_USER + '>',
        to, subject, html: bodyHtml
    });
};

// Helper: Tạo mật khẩu ngẫu nhiên
function generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

//GET LOGIN, SIGNUP PAGE
router.get('/', function (req, res) {
    res.redirect('/auth/login');
});

router.get('/login', function (req, res) {
    res.render('login', { layout: false, messages: req.flash() });
});

router.post('/login', async (req, res, next) => {
    // Rào lại kiểm tra reCAPTCHA
    // const recaptchaResponse = req.body['g-recaptcha-response'];
    // if (!recaptchaResponse) {
    //     req.flash('error', 'Vui lòng xác minh reCAPTCHA.');
    //     return res.redirect('/auth/login');
    // }

    try {
        // const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
        // const response = await axios.post(verifyUrl);
        // if (!response.data.success) {
        //     req.flash('error', 'Xác minh reCAPTCHA thất bại.');
        //     return res.redirect('/auth/login');
        // }

        // Proceed with Passport authentication using a custom callback
        passport.authenticate('local', (err, user, info) => {
            if (err) {
                console.error("Passport authentication error:", err);
                return next(err); // Pass error to Express error handler
            }
            if (!user) {
                // Authentication failed (e.g., wrong credentials)
                req.flash('error', info.message || 'Email hoặc mật khẩu không đúng.');
                return res.redirect('/auth/login');
            }

            // Authentication successful, log in the user
            req.logIn(user, (err) => {
                if (err) {
                    console.error("req.logIn error:", err);
                    return next(err);
                }

                // Handle "remember me" logic
                if (req.body.rememberme === 'on') {
                    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
                } else {
                    req.session.cookie.maxAge = null; // Session cookie
                }

                // Save session and redirect
                req.session.save((err) => {
                if (err) return next(err);
                res.redirect('/admin');
            });
        });
        })(req, res, next); // Ensure passport.authenticate middleware is called with req, res, next
    } catch (error) {
        console.error(error);
        req.flash('error', 'Lỗi hệ thống trong quá trình xác minh reCAPTCHA.');
        res.redirect('/auth/login');
    }
});

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
    req.logout(function(err) {
        if (err) { return next(err); }
        req.session.destroy(function() {
            res.redirect('/auth/login');
        });
    });
});

// GET: Hiển thị trang quên mật khẩu admin
router.get('/forgot-password', function(req, res) {
    res.render('forgot-password', { layout: false, messages: req.flash() });
});

// POST: Xử lý reset mật khẩu admin
router.post('/forgot-password', async function(req, res) {
    try {
        const { email } = req.body;
        const recaptchaResponse = req.body['g-recaptcha-response'];

        if (!recaptchaResponse) {
            req.flash('error', 'Vui lòng xác minh reCAPTCHA.');
            return res.redirect('/auth/forgot-password');
        }

        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
        const captchaRes = await axios.post(verifyUrl);
        if (!captchaRes.data.success) {
            req.flash('error', 'Xác minh reCAPTCHA thất bại.');
            return res.redirect('/auth/forgot-password');
        }

        const user = await User.findOne({ email, role: 'ADMIN' });
        if (!user) {
            // For security, it's better to give a generic message even if email not found
            req.flash('message', 'Nếu tài khoản tồn tại, mật khẩu mới sẽ được gửi đến email của bạn.');
            return res.redirect('/auth/login');
        }

        const newPassword = generateRandomPassword(12);
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        const subject = '[FootballGenZ Admin] Khôi phục mật khẩu hệ thống';
        const bodyHtml = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: #4f46e5;">Mật khẩu Admin đã được đặt lại</h2>
                <p>Mật khẩu mới của bạn là: <strong style="font-size: 18px;">${newPassword}</strong></p>
                <p>Vui lòng đăng nhập và đổi mật khẩu ngay để bảo mật hệ thống.</p>
                <hr>
                <small>Yêu cầu thực hiện vào lúc: ${new Date().toLocaleString()}</small>
            </div>`;

        await sendAdminEmail(user.email, subject, bodyHtml);
        req.flash('message', 'Mật khẩu mới đã được gửi vào email của bạn. Vui lòng kiểm tra hộp thư.');
        res.redirect('/auth/login');

    } catch (error) {
        console.error(error);
        req.flash('error', 'Đã có lỗi xảy ra trong quá trình khôi phục mật khẩu.');
        res.redirect('/auth/forgot-password');
    }
});

module.exports = router;
