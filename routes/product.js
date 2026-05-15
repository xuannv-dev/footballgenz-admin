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

        await product.save();

        res.send(
            'Create success'
        );

    }
    catch (err) {

        console.log(err);

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

            res.send(
                'Update success'
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

            const products =
                await Product.find();

            const Order =
                require('../models/order');

            const orders =
                await Order.find({
                    status: 4
                });

            // ================= SOLD MAP =================

            const soldMap = {};

            orders.forEach(order => {

                order.products.forEach(p => {

                    if (
                        !soldMap[
                            p.productCode
                        ]
                    ) {

                        soldMap[
                            p.productCode
                        ] = 0;

                    }

                    soldMap[
                        p.productCode
                    ] += p.quantity;

                });

            });

            // ================= STATS =================

            const stats =
                products.map(p => {

                    const stock =
                        calculateStock(
                            p.variants
                        );

                    const sold =
                        soldMap[
                            p.productCode
                        ] || 0;

                    return {

                        name:
                            p.name,

                        productCode:
                            p.productCode,

                        stock,

                        sold,

                        revenue:
                            sold * p.price

                    };

                });

            res.render(
                'partials/product/stats',
                {

                    stats,

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

module.exports = router;