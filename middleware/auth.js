module.exports = {

    enforceAuthentication: function (req, res, next){
        if(req.isAuthenticated()){
            return next();
        }
        res.redirect('/auth/login');
    },

    forwardAuthentication: function (req, res, next){
        if(req.isAuthenticated()){
            return res.redirect('/');
        }
        next();
    },

    // 🔥 THÊM MỚI: CHECK ADMIN
    isAdmin: function (req, res, next){
        if(req.isAuthenticated() && req.user.role === 'ADMIN'){
            return next();
        }
        return res.redirect('/auth/login');
    }

}