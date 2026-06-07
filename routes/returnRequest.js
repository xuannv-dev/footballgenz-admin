const express =
    require('express');

const Order =
    require('../models/order');

const Product =
    require('../models/product');

const router =
    express.Router();

const {

    ReturnRequest,

    RETURN_STATUS,

    RETURN_TYPE

} = require(
    '../models/returnRequest'
);

const {
    applyDateRangeFilter,
    buildQueryString
} = require('../utils/adminDateFilter');

const writeAuditLog =
    require('../utils/auditLog');
/* =====================================================
    LIST RETURN REQUEST
===================================================== */

router.get('/', async function(req, res){

    try{

        let page =
            req.query.page
                ? parseInt(req.query.page)
                : 1;

        const pageSize = 6;

        let keyword =
            req.query.keyword || '';

        let status =
            req.query.status || '';

        let query = {};

        // ================= SEARCH =================

        if(keyword){

            query.orderCode = {

                $regex: keyword,

                $options: 'i'

            };

        }

        // ================= FILTER STATUS =================

        if(status !== ''){

            query.status =
                parseInt(status);

        }

        const dateFilter =
            applyDateRangeFilter(query, req.query);

        const queryString =
            buildQueryString(req.query, {
                page: undefined
            });

        // ================= GET DATA =================

        const requests =
            await ReturnRequest.find(query)

                .sort({
                    createdAt: -1
                })

                .skip(
                    (page - 1)
                    * pageSize
                )

                .limit(pageSize);

        const count =
            await ReturnRequest.countDocuments(query);

        // ================= RENDER =================

        res.render(

            'partials/return/table',

            {

                requests,

                RETURN_STATUS,

                RETURN_TYPE,

                current: page,

                pages:
                    Math.ceil(
                        count / pageSize
                    ),

                keyword,

                selectedStatus:
                    status,

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

        res.send('Error');

    }

});

/* =====================================================
    ADD PAGE
===================================================== */

router.get('/add', function(req, res){

    res.render(
        'partials/return/add'
    );

});

/* =====================================================
    CREATE RETURN REQUEST
===================================================== */

router.post('/add', async function(req, res){

    try{

        // ================= VALIDATION =================

        if(!req.body.orderCode){

            return res.send(
                'Thiếu mã đơn hàng'
            );

        }

        // ================= CREATE =================

        const request =
            new ReturnRequest({

                orderCode:
                    req.body.orderCode,

                customerName:
                    req.body.customerName || '',

                returnType:
                    req.body.returnType,

                reason:
                    req.body.reason || '',

                adminNote:
                    req.body.adminNote || '',

                status:
                    RETURN_STATUS.PENDING

            });

        await request.save();

        res.send(
            'Create success'
        );

    }
    catch(err){

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
    '/detail/:id',
    async function(req, res){

        try{

            const request =
                await ReturnRequest.findById(
                    req.params.id
                );

            if(!request){

                return res.send(
                    'Request not found'
                );

            }

            res.render(

                'partials/return/detail',

                {

                    request,

                    RETURN_STATUS,

                    RETURN_TYPE

                }

            );

        }
        catch(err){

            console.log(err);

            res.send('Error');

        }

    }
);

/* =====================================================
    UPDATE STATUS
===================================================== */

router.post(
    '/update/:id',
    async function(req, res){

        try{

            const request =
                await ReturnRequest.findById(
                    req.params.id
                );

            if(!request){

                return res.send(
                    'Request not found'
                );

            }

            const newStatus =
                parseInt(req.body.status);

            const currentStatus =
                request.status;

            /* =========================================
                BUSINESS WORKFLOW
            ========================================= */

            const allowedTransitions = {

                // Chờ xử lý
                1: [2, 3],

                // Đã duyệt
                2: [4],

                // Từ chối
                3: [],

                // Hoàn thành
                4: []

            };

            const allowed =
                allowedTransitions[
                    currentStatus
                ] || [];

            // ================= VALID FLOW =================

            if(
                !allowed.includes(
                    newStatus
                )
            ){

                return res.send(
                    'Không thể cập nhật trạng thái'
                );

            }

            // ================= UPDATE =================

            request.status =
                newStatus;

            request.adminNote =
                req.body.adminNote || '';

            await request.save();

            /* =========================================
                RESTORE STOCK
            ========================================= */

            if(newStatus === 4){

                const product =
                    await Product.findOne({
                        productCode: request.productCode
                    });

                if(product && product.variants){

                    const variant =
                        product.variants.find(v =>
                            v.size == request.size
                            &&
                            v.color == request.color
                        );

                    if(variant){
                        variant.stock += request.quantity;
                        await product.save();
                    }

                }

            }
            await writeAuditLog({

                adminId:
                    req.user._id,

                action:
                    'APPROVE_RETURN',

                targetType:
                    'ReturnRequest',

                targetId:
                    request._id,

                description:
                    `Xác nhận yêu cầu trả hàng ${request._id}`

            });
            res.send(
                'Cập nhật trạng thái thành công!'
            );

        }
        catch(err){

            console.log(err);

            res.send(
                'Cập nhật trạng thái thất bại!'
            );

        }

    }
);

module.exports = router;
