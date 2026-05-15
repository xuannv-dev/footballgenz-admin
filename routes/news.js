const express = require('express');

const router = express.Router();

const News = require('../models/news');

/* =====================================================
    LIST NEWS
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

        let query = {};

        // ================= SEARCH =================

        if (keyword) {

            query.title = {

                $regex: keyword,

                $options: 'i'

            };

        }

        // ================= GET NEWS =================

        const news =
            await News.find(query)

                .sort({
                    createdAt: -1
                })

                .skip(
                    (page - 1)
                    * pageSize
                )

                .limit(pageSize);

        const count =
            await News.countDocuments(query);

        // ================= RENDER =================

        res.render(
            'partials/news/table',
            {

                news,

                current: page,

                pages:
                    Math.ceil(
                        count / pageSize
                    ),

                keyword

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

router.get('/add', function (req, res) {

    res.render(
        'partials/news/add'
    );

});

/* =====================================================
    CREATE NEWS
===================================================== */

router.post('/add', async function (req, res) {

    try {

        // ================= VALIDATION =================

        if (!req.body.title) {

            return res.send(
                'Thiếu tiêu đề'
            );

        }

        // ================= CREATE =================

        const news =
            new News({

                title:
                    req.body.title,

                slug:
                    req.body.slug,

                thumbnail:
                    req.body.thumbnail || '',

                description:
                    req.body.description || '',

                content:
                    req.body.content || '',

                isActive: true

            });

        await news.save();

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
    '/detail/:slug',
    async function (req, res) {

        try {

            const news =
                await News.findOne({

                    slug:
                        req.params.slug

                });

            if (!news) {

                return res.send(
                    'News not found'
                );

            }

            res.render(
                'partials/news/detail',
                {

                    news

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
    '/edit/:slug',
    async function (req, res) {

        try {

            const news =
                await News.findOne({

                    slug:
                        req.params.slug

                });

            if (!news) {

                return res.send(
                    'News not found'
                );

            }

            res.render(
                'partials/news/edit',
                {

                    news

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
    UPDATE NEWS
===================================================== */

router.put(
    '/update/:slug',
    async function (req, res) {

        try {

            if (!req.body.title) {

                return res.send(
                    'Thiếu tiêu đề'
                );

            }

            await News.updateOne(

                {
                    slug:
                        req.params.slug
                },

                {
                    $set: {

                        title:
                            req.body.title,

                        slug:
                            req.body.slug,

                        thumbnail:
                            req.body.thumbnail || '',

                        description:
                            req.body.description || '',

                        content:
                            req.body.content || '',

                        isActive:
                            req.body.isActive == 'true'

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
    '/delete/:slug',
    async function (req, res) {

        try {

            await News.updateOne(

                {
                    slug:
                        req.params.slug
                },

                {
                    isActive: false
                }

            );

            res.redirect('/news');

        }
        catch (err) {

            console.log(err);

            res.redirect('/news');

        }

    }
);

/* =====================================================
    ACTIVE NEWS
===================================================== */

router.get(
    '/active/:slug',
    async function (req, res) {

        try {

            await News.updateOne(

                {
                    slug:
                        req.params.slug
                },

                {
                    isActive: true
                }

            );

            res.redirect('/news');

        }
        catch (err) {

            console.log(err);

            res.redirect('/news');

        }

    }
);

module.exports = router;