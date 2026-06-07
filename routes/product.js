const express = require('express');
const router = express.Router();

const Product = require('../models/product');
const Category = require('../models/category');

const generateProductCode =
    require('../utils/generateProductCode');

const calculateStock =
    require('../utils/calculateStock');

const formatCurrency =
    require('../utils/formatCurrency');

const {
    applyDateRangeFilter,
    buildQueryString
} = require('../utils/adminDateFilter');

const writeAuditLog =
    require('../utils/auditLog');
/* =====================================================
    LIST PRODUCT
===================================================== */

router.get('/', async function (req, res) {

    try {

        let page =
            req.query.page
                ? parseInt(req.query.page)
                : 1;

        const pageSize = 6;

        let keyword =
            req.query.keyword || '';

        let group =
            req.query.group || '';

        let minPrice =
            req.query.minPrice || '';

        let maxPrice =
            req.query.maxPrice || '';

        let query = {};

        // ================= SEARCH =================

        if (keyword) {

            query.$or = [

                {
                    name: {
                        $regex: keyword,
                        $options: 'i'
                    }
                },

                {
                    productCode: {
                        $regex: keyword,
                        $options: 'i'
                    }
                }

            ];

        }

        // ================= GROUP =================

        if (group) {

            query.group = group;

        }

        // ================= PRICE =================

        if (minPrice || maxPrice) {

            query.price = {};

            if (minPrice) {

                query.price.$gte =
                    parseInt(minPrice);

            }

            if (maxPrice) {

                query.price.$lte =
                    parseInt(maxPrice);

            }

        }

        const dateFilter =
            applyDateRangeFilter(query, req.query);

        const queryString =
            buildQueryString(req.query, {
                page: undefined
            });

        // ================= GET PRODUCT =================

        const products =
            await Product.find(query)

                .sort({
                    createdAt: -1
                })

                .skip(
                    (page - 1)
                    * pageSize
                )

                .limit(pageSize);

        const count =
            await Product.countDocuments(query);

        // ================= RENDER =================

        res.render(
            'partials/product/table',
            {

                products,

                current: page,

                pages:
                    Math.ceil(
                        count / pageSize
                    ),

                keyword,

                group,

                minPrice,

                maxPrice,

                fromDate:
                    dateFilter.fromDate,

                toDate:
                    dateFilter.toDate,

                queryString,

                calculateStock,

                formatCurrency

            }
        );

    }
    catch (err) {

        console.log(err);

        res.send('Error');

    }

});

/* =====================================================
    ADD PAGE
===================================================== */

router.get('/add', async function (req, res) {

    try {

        const categories =
            await Category.find();

        res.render(
            'partials/product/add',
            { categories }
        );

    }
    catch (err) {

        console.log(err);

        res.send('Load add page failed');

    }

});

/* =====================================================
    CREATE PRODUCT
===================================================== */

router.post('/add', async function (req, res) {

    try {

        // ================= VARIANTS =================

        let variants =
            req.body.variants || [];

        variants = variants.map(v => ({

            size: v.size,

            color: v.color,

            stock:
                parseInt(v.stock) || 0

        }));

        // ================= VALIDATION =================

        if (!req.body.name) {

            return res.send(
                'Thiếu tên sản phẩm'
            );

        }

        if (
            !req.body.price
            ||
            parseInt(req.body.price) <= 0
        ) {

            return res.send(
                'Giá sản phẩm không hợp lệ'
            );

        }

        if (!variants.length) {

            return res.send(
                'Phải có ít nhất 1 biến thể'
            );

        }

        // stock âm

        const invalidStock =
            variants.some(
                v => v.stock < 0
            );

        if (invalidStock) {

            return res.send(
                'Stock không hợp lệ'
            );

        }

        // duplicate variant

        const variantSet =
            new Set();

        for (const v of variants) {

            const key =
                `${v.size}-${v.color}`;

            if (
                variantSet.has(key)
            ) {

                return res.send(
                    'Biến thể bị trùng'
                );

            }

            variantSet.add(key);

        }

        // ================= CREATE =================

        const product =
            new Product({

                productCode:
                    await generateProductCode(
                        req.body.group,
                        req.body.brand
                    ),

                name:
                    req.body.name,

                price:
                    parseInt(req.body.price),

                brand:
                    req.body.brand,

                group:
                    req.body.group,

                images:
                    req.body.images || [],

                description:
                    req.body.description || '',

                isActive: true,

                variants

            });
        console.log(
            JSON.stringify(
                product,
                null,
                2
            )
        );    
        await product.save();
        
        res.send(
            'Create success'
        );

    }
    catch(err){

        console.log(
            'SAVE ERROR:',
            err
        );

        res.send(
            'Create failed'
        );

    }

});

/* =====================================================
    DETAIL
===================================================== */

router.get(
    '/detail/:productCode',
    async function (req, res) {

        try {

            const categories =
                await Category.find();

            const product =
                await Product.findOne({

                    productCode:
                        req.params.productCode

                });

            if (!product) {

                return res.send(
                    'Product not found'
                );

            }

            res.render(
                'partials/product/detail',
                {

                    product,

                    categories,

                    calculateStock,

                    formatCurrency

                }
            );

        }
        catch (err) {

            console.log(err);

            res.send('Error');

        }

    }
);

/* =====================================================
    EDIT PAGE
===================================================== */

router.get(
    '/edit/:productCode',
    async function (req, res) {

        try {

            const categories =
                await Category.find();

            const product =
                await Product.findOne({

                    productCode:
                        req.params.productCode

                });

            if (!product) {

                return res.send(
                    'Product not found'
                );

            }

            res.render(
                'partials/product/edit',
                {

                    product,

                    categories

                }
            );

        }
        catch (err) {

            console.log(err);

            res.send('Error');

        }

    }
);

/* =====================================================
    UPDATE PRODUCT
===================================================== */

router.put(
    '/update/:productCode',
    async function (req, res) {
        console.log('Update group product:', req.body.group);
        try {

            // ================= VARIANTS =================

            let variants =
                req.body.variants || [];

            variants = variants.map(v => ({

                size: v.size,

                color: v.color,

                stock:
                    parseInt(v.stock) || 0

            }));

            // ================= VALIDATION =================

            if (!req.body.name) {

                return res.send(
                    'Thiếu tên sản phẩm'
                );

            }

            if (
                !req.body.price
                ||
                parseInt(req.body.price) <= 0
            ) {

                return res.send(
                    'Giá sản phẩm không hợp lệ'
                );

            }

            if (!variants.length) {

                return res.send(
                    'Phải có ít nhất 1 biến thể'
                );

            }

            const invalidStock =
                variants.some(
                    v => v.stock < 0
                );

            if (invalidStock) {

                return res.send(
                    'Stock không hợp lệ'
                );

            }

            // duplicate variant

            const variantSet =
                new Set();

            for (const v of variants) {

                const key =
                    `${v.size}-${v.color}`;

                if (
                    variantSet.has(key)
                ) {

                    return res.send(
                        'Biến thể bị trùng'
                    );

                }

                variantSet.add(key);

            }

            // ================= UPDATE =================

            await Product.updateOne(

                {
                    productCode:
                        req.params.productCode
                },

                {
                    $set: {

                        name:
                            req.body.name,

                        price:
                            parseInt(
                                req.body.price
                            ),

                        brand:
                            req.body.brand,

                        group:
                            req.body.group,

                        images:
                            req.body.images || [],

                        description:
                            req.body.description || '',

                        variants

                    }
                }

            );
            await writeAuditLog({

                adminId:
                    req.user._id,

                action:
                    'UPDATE_PRODUCT',

                targetType:
                    'Product',

                targetId:
                    req.params.productCode,

                description:
                    `Admin cập nhật sản phẩm ${req.params.productCode}`

            });
            res.send(
                'Cập nhật sản phẩm thành công!'
            );

        }
        catch (err) {

            console.log(err);

            res.send(
                'Update failed'
            );

        }

    }
);

/* =====================================================
    SOFT DELETE
===================================================== */

router.get(
    '/delete/:productCode',
    async function (req, res) {

        try {

            await Product.updateOne(

                {
                    productCode:
                        req.params.productCode
                },

                {
                    isActive: false
                }

            );
            await writeAuditLog({

                adminId:
                    req.user._id,

                action:
                    'DELETE_PRODUCT',

                targetType:
                    'Product',

                targetId:
                    req.params.productCode,

                description:
                    `Admin x sản phẩm ${req.params.productCode}`

            });
            res.redirect('/product');

        }
        catch (err) {

            console.log(err);

            res.redirect('/product');

        }

    }
);

/* =====================================================
    ACTIVE PRODUCT
===================================================== */

router.get(
    '/active/:productCode',
    async function (req, res) {

        try {

            await Product.updateOne(

                {
                    productCode:
                        req.params.productCode
                },

                {
                    isActive: true
                }

            );

            res.redirect('/product');

        }
        catch (err) {

            console.log(err);

            res.redirect('/product');

        }

    }
);

/* =====================================================
    PRODUCT STATS
===================================================== */

router.get(
    '/stats',
    async function (req, res) {

        try {

            const products = await Product.find().lean();
            const Order    = require('../models/order');

            // ================= SOLD MAP BY VARIANT =================
            // key = "productCode|size|color"

            const variantSoldMap = {};

            const completedOrders = await Order.find({ status: 4 }).lean();

            completedOrders.forEach(order => {

                order.products.forEach(p => {

                    const key = `${p.productCode}|${p.size || ''}|${p.color || ''}`;

                    if (!variantSoldMap[key]) variantSoldMap[key] = 0;

                    variantSoldMap[key] += p.quantity;

                });

            });

            // ================= BUILD STATS PER PRODUCT =================

            const stats = products.map(p => {

                const totalStock = calculateStock(p.variants);

                // Tổng sold toàn sản phẩm (tất cả variant)
                let totalSold    = 0;
                let totalRevenue = 0;
                let totalProfit  = 0;

                // Chi tiết từng variant
                const variantStats = (p.variants || []).map(v => {

                    const key  = `${p.productCode}|${v.size || ''}|${v.color || ''}`;
                    const sold = variantSoldMap[key] || 0;

                    const revenue = sold * p.price;
                    const profit  = sold * (p.price - (p.costPrice || 0));

                    totalSold    += sold;
                    totalRevenue += revenue;
                    totalProfit  += profit;

                    return {
                        size:    v.size,
                        color:   v.color,
                        stock:   v.stock,
                        sold,
                        revenue,
                        profit
                    };

                });

                return {
                    name:         p.name,
                    productCode:  p.productCode,
                    price:        p.price,
                    costPrice:    p.costPrice || 0,
                    totalStock,
                    totalSold,
                    totalRevenue,
                    totalProfit,
                    margin: totalRevenue > 0
                        ? Math.round((totalProfit / totalRevenue) * 100)
                        : 0,
                    variantStats
                };

            });

            res.render(
                'partials/product/stats',
                { stats, formatCurrency }
            );

        }
        catch (err) {

            console.log(err);
            res.send('Error');

        }

    }
);

module.exports = router;
