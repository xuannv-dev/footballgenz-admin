var express = require('express');
var router = express.Router();
const OutBill = require('../models/outbill');
const Product = require('../models/product');

/* GET users listing. */
router.get('/',async function (req, res, next) {
  let page = (typeof req.query.page != 'undefined')?req.query.page:1;
    console.log(page);
    let pageSize = 6;
    OutBill.find().skip((page-1)*pageSize).limit(pageSize).exec((err,outbills)=>{
        OutBill.countDocuments((err,count)=>{
            let bills = outbills.map(async (bill)=>{
              return await bill.populate('customer');
            })
            if(err) return next(err);
            res.render('partials/bill/table',{
              outbills:outbills,
                current:page,
                pages:Math.ceil(count/pageSize)
            })
        })
    })
});
router.get('/add', async function (req, res) {
  let getAllProducts = await Product.find();
  res.render("partials/bill/add", { products: getAllProducts });
})
router.post('/add', async function (req, res) {
  let outbill = new OutBill({
    code: getRandomString(6),
    totalprice: req.body.totalprice,
    note: req.body.note,
    products: req.body.products,
    customer: req.body.user,
    addressShip: req.body.addressShip,
    typePay: req.body.typePay,
    status: 1
  });
  outbill.save().then(result => {
    console.log(result);
    res.send('upload suscess !')
  }).catch(err => {
    console.log(err);
    res.send('upload Failed !')
  })
})
router.get("/detail/:code",async function(req,res){
  const code = req.params.code;
  let getAllProducts = await Product.find();
  var bill = await OutBill.findOne({code:code});
  await bill.populate('customer');
  res.render("partials/bill/detail",{bill:bill,products:getAllProducts});
})
router.put("/update/:code",async function(req,res){
  const code = req.params.code;
  const outbill = await OutBill.findOne({code:code});
  const checkQuantity = async (item) => {
    let quantity = await Product.findOne({productCode:item.productCode}).quantity;
    if(item.quantity > quantity) return false;
    return true;
  }
  let result = outbill.products.every(checkQuantity);
  // var bill = await OutBill.findOne({code:code});
  try {
    if(result == true) res.send('update suscess');
    res.status(400).send('update failed');
} catch (error) {
    res.send('update failed !');
}
})
function getRandomString(length) {
  var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var result = '';
  for ( var i = 0; i < length; i++ ) {
      result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
  }
  return result;
}

module.exports = router;
