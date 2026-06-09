var express = require('express');
var router = express.Router();

const AdminLog =
require('../models/adminLog');

const {
applyDateRangeFilter,
buildQueryString
} = require('../utils/adminDateFilter');

router.get('/', async function(req,res){

try{

    let page =
        req.query.page
            ? parseInt(req.query.page)
            : 1;

    const pageSize = 10;

    const keyword =
        req.query.keyword || '';

    const action =
        req.query.action || '';

    let query = {};

    // ================= ACTION FILTER =================

    if(action){

        query.action = action;

    }

    // ================= DATE FILTER =================

    const dateFilter =
        applyDateRangeFilter(
            query,
            req.query
        );

    // ================= GET DATA =================

    let logs =
        await AdminLog

            .find(query)

            .populate(
                'admin',
                'email firstname lastname role'
            )

            .sort({
                createdAt:-1
            });

    // ================= KEYWORD FILTER =================

    if(keyword){

        logs = logs.filter(log =>

            log.admin
            &&
            log.admin.email
                .toLowerCase()
                .includes(
                    keyword.toLowerCase()
                )

        );

    }

    const count =
        logs.length;

    logs =
        logs.slice(

            (page - 1)
            * pageSize,

            page
            * pageSize

        );

    const queryString =
        buildQueryString(
            req.query,
            {
                page: undefined
            }
        );

    res.render(

        'partials/adminlog/table',

        {

            logs,

            current: page,

            pages:
                Math.ceil(
                    count / pageSize
                ),

            keyword,

            action,

            fromDate:
                dateFilter.fromDate,

            toDate:
                dateFilter.toDate,

            queryString

        }

    );

}
catch(err){

    console.log(err);

    res.send(
        'Load audit logs failed'
    );

}

});

module.exports = router;
