const express = require('express');

const router = express.Router();

const Review = require('../models/review');

const {
    applyDateRangeFilter,
    buildQueryString
} = require('../utils/adminDateFilter');

/* =====================================================
    LIST REVIEW
===================================================== */

router.get('/', async function (req, res) {

    try {

        let page =
            req.query.page
                ? parseInt(req.query.page)
                : 1;

        const pageSize = 10;

        let keyword =
            req.query.keyword || '';

        let query = {};

        // SEARCH

        if (keyword) {

            query.$or = [

                {
                    customerName: {
                        $regex: keyword,
                        $options: 'i'
                    }
                },

                {
                    productname: {
                        $regex: keyword,
                        $options: 'i'
                    }
                }

            ];

        }

        const dateFilter =
            applyDateRangeFilter(query, req.query);

        const queryString =
            buildQueryString(req.query, {
                page: undefined
            });

        const reviews =
            await Review.find(query)

                .sort({
                    createdAt: -1
                })

                .skip(
                    (page - 1) * pageSize
                )

                .limit(pageSize);

        const count =
            await Review.countDocuments(query);

        res.render(
            'partials/review/table',
            {

                reviews,

                current: page,

                pages:
                    Math.ceil(
                        count / pageSize
                    ),

                keyword,

                fromDate:
                    dateFilter.fromDate,

                toDate:
                    dateFilter.toDate,

                queryString

            }
        );

    }
    catch (err) {

        console.log(err);

        res.send('Error');

    }

});

/* =====================================================
    DETAIL
===================================================== */

router.get(
    '/detail/:id',
    async function (req, res) {

        try {

            const review =
                await Review.findById(
                    req.params.id
                );

            if (!review) {

                return res.send(
                    'Review not found'
                );

            }

            res.render(
                'partials/review/detail',
                {
                    review
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
    UPDATE REVIEW
===================================================== */

router.post(
    '/update/:id',
    async function (req, res) {

        try {

            const review =
                await Review.findById(
                    req.params.id
                );

            if (!review) {

                return res.send(
                    'Review not found'
                );

            }

            review.adminNote =
                req.body.adminNote || '';

            review.isActive =
                req.body.isActive === 'true';

            await review.save();


            res.redirect(
                '/review'
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

module.exports = router;
