if(process.env.NODE_ENV !== 'production'){
  require('dotenv').config();
}

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const expressLayouts = require('express-ejs-layouts');
var flash = require('express-flash');
const bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');

var indexRouter = require('./routes/index');
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var authRouter = require('./routes/auth');
var productRouter = require('./routes/product');
var uploadRouter = require('./routes/upload');
var cateRouter= require('./routes/category');
var orderRouter= require('./routes/order');
var adminUserRouter = require('./routes/admin-user');
var newsRouter = require('./routes/news');
var returnRouter = require('./routes/returnRequest');
var reviewRouter = require('./routes/review');

var authMiddleware = require('./middleware/auth');

// 🔥 FIX: import đúng
const user = require('./models/user');

const initializePassport = require('./passport-config');
const auditLogRouter =
    require('./routes/auditLog');

var app = express();
var db = require('./models/db');

// ================= PASSPORT =================
initializePassport(
  passport,
  async (email) => {
    return await user.findOne({ email: email });
  },
  async (id) => {
    return await user.findById(id);
  }
);

// ================= VIEW =================
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// ================= MIDDLEWARE =================
app.disable('view cache');

app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(flash());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(expressLayouts);
app.set('layout','./layouts/layout');

// 🔥 GLOBAL USER
app.use(function(req,res,next){
  res.locals.user = req.user || null;
  next();
});

// ================= ROUTES =================

// Auth
app.use('/auth', authRouter);

// 🔥 ADMIN ONLY
app.use('/', authMiddleware.isAdmin, indexRouter);
app.use('/admin', authMiddleware.isAdmin, adminRouter);
app.use('/product', authMiddleware.isAdmin, productRouter);
app.use('/upload', authMiddleware.isAdmin, uploadRouter);
app.use('/category', authMiddleware.isAdmin, cateRouter);
app.use('/order', authMiddleware.isAdmin, orderRouter);
app.use('/admin-user', authMiddleware.isAdmin, adminUserRouter);
app.use('/news', authMiddleware.isAdmin, newsRouter);
app.use('/return', authMiddleware.isAdmin, returnRouter);
app.use('/review', authMiddleware.isAdmin, reviewRouter);
app.use('/audit-log',authMiddleware.isAdmin, auditLogRouter);
// USER (nếu cần giữ)
app.use('/user', authMiddleware.enforceAuthentication, userRouter);

// ================= ERROR =================
app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error',{layout:false});
});

module.exports = app;