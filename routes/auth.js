var express = require('express');
var router = express.Router();
const passport = require('passport');

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
        res.redirect('/');
    }
);
router.get('/logout', function (req, res) {
    req.logOut();
    res.redirect('/');
});
module.exports = router;
