var express = require('express');
var router = express.Router();

const Category = require('../models/category');
const slugify = require('slugify');

const {
    applyDateRangeFilter,
    buildQueryString
} = require('../utils/adminDateFilter');

/* ================= LIST ================= */
router.get('/', async function (req, res) {

    let page = req.query.page
        ? parseInt(req.query.page)
        : 1;

    let pageSize = 6;

    let keyword = req.query.keyword || '';

    let query = {};

    // 🔥 SEARCH
    if (keyword.trim() !== '') {

        query.$or = [
            { name: { $regex: keyword, $options: 'i' } },
            { group: { $regex: keyword, $options: 'i' } }
        ];

    }

    const dateFilter =
        applyDateRangeFilter(query, req.query);

    const queryString =
        buildQueryString(req.query, {
            page: undefined
        });

    try {

        const categories = await Category.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize);

        const count =
            await Category.countDocuments(query);

        res.render('partials/category/table', {

            categories,

            current: page,

            pages: Math.ceil(count / pageSize),

            keyword,

            fromDate:
                dateFilter.fromDate,

            toDate:
                dateFilter.toDate,

            queryString

        });

    } catch (err) {

        console.log(err);

        res.send("Error");

    }

});


/* ================= ADD PAGE ================= */
router.get('/add', function (req, res) {

    res.render('partials/category/add');

});


/* ================= DETAIL ================= */
router.get('/detail/:id', async function (req, res) {

    try {

        const category =
            await Category.findById(req.params.id);

        if (!category) {
            return res.send("Category not found");
        }

        res.render('partials/category/detail', {
            category
        });

    } catch (err) {

        console.log(err);

        res.send("Error");

    }

});


/* ================= ADD ================= */
router.post('/add', async function (req, res) {

    try {

        let category = new Category({

            code: getRandomString(6),

            name: req.body.name,

            group: req.body.group,

            type: req.body.type,

            image: req.body.image,

            isActive: req.body.isActive === 'true'

        });

        await category.save();

        res.send('Create category success!');

    } catch (err) {

        console.log(err);

        res.status(500)
            .send('Create category failed!');

    }

});


/* ================= UPDATE ================= */
router.put('/update/:id', async function (req, res) {

    try {

        const newSlug = slugify(req.body.name, {
            lower: true,
            strict: true,
            locale: 'vi'
        });

        await Category.updateOne(

            { _id: req.params.id },

            {
                $set: {

                    name: req.body.name,

                    group: req.body.group,

                    slug: newSlug,

                    type: req.body.type,

                    image: req.body.image,

                    isActive: req.body.isActive == true

                }
            }

        );

        res.send('Update success!');

    } catch (err) {

        console.log(err);

        res.status(500)
            .send('Update failed!');

    }

});


/* ================= DELETE ================= */
router.delete('/delete/:id', async function (req, res) {

    try {

        await Category.deleteOne({
            _id: req.params.id
        });

        res.send("Delete success!");

    } catch (err) {

        console.log(err);

        res.status(500)
            .send("Delete failed!");

    }

});


/* ================= HELPER ================= */
function getRandomString(length) {

    var chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    var result = '';

    for (var i = 0; i < length; i++) {

        result += chars.charAt(
            Math.floor(Math.random() * chars.length)
        );

    }

    return result;

}

module.exports = router;
