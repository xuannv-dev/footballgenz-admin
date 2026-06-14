const nodemailer = require('nodemailer');
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Cấu hình transporter (Sử dụng Gmail hoặc SMTP của bạn)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Định nghĩa trong file .env
        pass: process.env.EMAIL_PASS  // Mật khẩu ứng dụng App Password
    }
});

/**
 * Tạo bảng danh sách sản phẩm dưới dạng HTML
 * @param {Array} products - Mảng sản phẩm từ order.products
 */
const getProductListHtml = (products) => {
    let rows = '';
    products.forEach(item => {
        rows += `
            <tr>
                <td style="border: 1px solid #eee; padding: 8px;">${item.productname}</td>
                <td style="border: 1px solid #eee; padding: 8px; text-align: center;">${item.size} / ${item.color}</td>
                <td style="border: 1px solid #eee; padding: 8px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #eee; padding: 8px; text-align: right;">${item.price.toLocaleString('vi-VN')}₫</td>
            </tr>`;
    });

    return `
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f8f9fa;">
                    <th style="border: 1px solid #eee; padding: 8px; text-align: left;">Sản phẩm</th>
                    <th style="border: 1px solid #eee; padding: 8px;">Size/Màu</th>
                    <th style="border: 1px solid #eee; padding: 8px;">SL</th>
                    <th style="border: 1px solid #eee; padding: 8px; text-align: right;">Đơn giá</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
};

/**
 * Cấu hình kết nối Redis
 */
const connection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    username: process.env.REDIS_USERNAME || undefined, // Thêm username cho Redis 6+ ACLs
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        // Tự động kết nối lại sau một khoảng thời gian tăng dần, tối đa 2 giây
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// Promise để chờ Redis sẵn sàng
const waitUntilRedisReady = new Promise((resolve, reject) => {
    if (connection.status === 'ready') {
        return resolve();
    }

    // Thiết lập timeout 5 giây
    const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Redis connection timeout (5000ms)'));
    }, 5000);

    const onReady = () => {
        cleanup();
        resolve();
    };

    const onError = (err) => {
        cleanup();
        reject(err);
    };

    const cleanup = () => {
        clearTimeout(timeout);
        connection.off('ready', onReady);
        connection.off('error', onError);
    };

    connection.on('ready', onReady);
    connection.on('error', onError);
});

// Kiểm tra trạng thái kết nối Redis
connection.on('connect', () => {
    console.log('🚀 [REDIS] Đang thiết lập kết nối tới Redis Cloud...');
});

connection.on('ready', () => {
    console.log('✅ [REDIS] Kết nối thành công và đã sẵn sàng!');
});

connection.on('reconnecting', () => {
    console.warn('⚠️ [REDIS] Mất kết nối! Đang thử kết nối lại...');
});

connection.on('close', () => {
    console.error('🚫 [REDIS] Kết nối đã bị đóng.');
});

connection.on('error', (err) => {
    console.error('❌ [REDIS ERROR] Lỗi kết nối:', err.message);
});

/**
 * Khởi tạo Hàng đợi (Queue)
 */
const emailQueue = new Queue('emailOrderQueue', { connection });

/**
 * PRODUCER: Hàm này được gọi từ các nơi khác trong ứng dụng để gửi email.
 * Thay vì gửi mail ngay, nó chỉ đẩy dữ liệu vào Queue rồi xong việc.
 * @param {string} to - Địa chỉ email người nhận.
 * @param {string} subject - Tiêu đề email.
 * @param {string} bodyHtml - Nội dung email dưới dạng HTML.
 * @param {string} [type='GENERIC'] - Loại email (ví dụ: 'SUCCESS', 'CANCELLED_TIMEOUT', 'ADMIN_NEW_ORDER', 'PASSWORD_RESET').
 * @param {Object} [data={}] - Dữ liệu bổ sung cần thiết cho việc tạo email (ví dụ: order object).
 */
const sendEmail = async (to, subject, bodyHtml, type = 'GENERIC', data = {}) => {
    if (!to || !to.includes('@')) {
        console.log(`[EMAIL] Bỏ qua gửi email loại ${type}: Địa chỉ email người nhận không hợp lệ.`);
        return;
    }

    try {
        // Chờ Redis sẵn sàng trước khi đẩy job vào hàng đợi (đảm bảo kết nối ban đầu)
        await waitUntilRedisReady;

        // Kiểm tra trạng thái Redis ngay trước khi thêm job (để xử lý mất kết nối sau khi đã ready)
        if (connection.status !== 'ready') {
            throw new Error('Redis connection lost or not ready. Fallback to direct send.');
        }

        const orderCode = (data && data.order) ? data.order.code : 'no-order';

        // Thêm job vào hàng đợi
        await emailQueue.add(`email-${orderCode}-${type}-${Date.now()}`, { to, subject, bodyHtml, type, data }, {
            attempts: 3, // Nếu lỗi SMTP (mạng lag), tự động thử lại 3 lần
            backoff: {
                type: 'exponential',
                delay: 5000, // Đợi 5s mới thử lại lần 2
            },
            removeOnComplete: true, // Xử lý xong thì xóa để nhẹ Redis
            removeOnFail: 1000 // Giữ lại lịch sử 1000 đơn lỗi để kiểm tra
        });
        console.log(`[EMAIL MQ] Đã đưa email loại ${type} tới ${to} vào hàng đợi xử lý.`);
    } catch (error) {
        console.error(`[EMAIL MQ FALLBACK] Lỗi Queue (${error.message}). Đang gửi trực tiếp...`);
        // FALLBACK: Gửi trực tiếp không qua hàng đợi nếu Redis không sẵn sàng
        actualSendEmailLogic(to, subject, bodyHtml, type, data).catch(err => {
            console.error('[CRITICAL EMAIL ERROR] Gửi mail trực tiếp cũng thất bại:', err.message);
        });
    }
};

/**
 * Worker xử lý việc gửi mail thực tế (Chạy ngầm)
 * Khi có job trong Queue, Worker này sẽ tự động lấy ra xử lý
 */
new Worker('emailOrderQueue', async (job) => {
    const { to, subject, bodyHtml, type, data } = job.data;
    console.log(`[MQ WORKER] Đang xử lý email loại ${type} tới ${to}`);
    
    try {
        await actualSendEmailLogic(to, subject, bodyHtml, type, data);
    } catch (error) {
        console.error(`[MQ WORKER ERROR] Job ${job.id} thất bại:`, error);
        throw error; // Quăng lỗi để BullMQ biết và thực hiện Retry (thử lại)
    }
}, { 
    connection,
    concurrency: 5 // Xử lý tối đa 5 mail cùng lúc (tránh spam SMTP)
});

/**
 * Logic gửi mail thực tế (Nội dung cũ của sendOrderEmail, giờ được gọi từ Worker hoặc Fallback)
 * @param {string} to - Địa chỉ email người nhận.
 * @param {string} subject - Tiêu đề email.
 * @param {string} bodyHtml - Nội dung email dưới dạng HTML.
 * @param {string} type - Loại email (để log hoặc xử lý đặc biệt nếu cần).
 * @param {Object} data - Dữ liệu bổ sung (ví dụ: order object).
 */
const actualSendEmailLogic = async (to, passedSubject, passedBodyHtml, type, data) => {
    let subject = passedSubject || '';
    let bodyHtml = passedBodyHtml || '';
    let recipient = to; // Mặc định người nhận là 'to'

    // Nếu là email liên quan đến đơn hàng, chúng ta cần order object từ data
    const order = data.order;
    const productListHtml = order ? getProductListHtml(order.products) : '';

    // Định nghĩa các Template dựa trên loại thông báo
    switch (type) {
        case 'ADMIN_NEW_ORDER':
            subject = `[Admin] Thông báo đơn hàng mới - #${order.code}`;
            bodyHtml = `
                <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                    <h2 style="color: #007bff;">🔔 Có đơn hàng mới!</h2>
                    <p>Hệ thống vừa nhận được đơn hàng mới <strong>#${order.code}</strong>.</p>
                    <p>Khách hàng: <strong>${order.receiver}</strong> (${order.creator})</p>
                    <p>Số điện thoại: <strong>${order.phoneContact}</strong></p>
                    <p>Địa chỉ: <strong>${order.addressShip}</strong></p>
                    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Sản phẩm:</h3>
                    ${productListHtml}
                    <p>Tổng tiền: <strong>${order.totalprice.toLocaleString('vi-VN')}₫</strong></p>
                    <p>Phương thức: <strong>${order.typePay === 0 ? 'COD' : 'Chuyển khoản'}</strong></p>
                    <hr style="border: none; border-top: 1px solid #eee;">
                    <p>Vui lòng đăng nhập hệ thống quản trị để xử lý đơn hàng.</p>
                    <p><a href="${process.env.ADMIN_URL}/orders/${order._id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Xem chi tiết đơn hàng</a></p>
                </div>`;
            break;
        case 'ORDER_CREATED':
            subject = `[FootballGenZ] Đã tạo đơn hàng - Chờ thanh toán #${order.code}`;
            bodyHtml = ` <div style="font-family: sans-serif; line-height: 1.5; color: #333;"> <h2 style="color: #0d6efd;">Đơn hàng đã được tạo</h2>

                    <p>Chào <strong>${order.receiver}</strong>,</p>

                    <p>
                        Hệ thống đã ghi nhận đơn hàng
                        <strong>#${order.code}</strong> của bạn.
                    </p>

                    <div style="
                        background:#e7f1ff;
                        border-left:4px solid #0d6efd;
                        padding:12px;
                        margin:15px 0;
                    ">
                        💳 Trạng thái hiện tại:
                        <strong>Chờ thanh toán</strong>
                    </div>

                    <p>
                        Vui lòng hoàn tất thanh toán và gửi minh chứng chuyển khoản
                        để đơn hàng được xác nhận.
                    </p>

                    <h3 style="border-bottom:1px solid #ccc;padding-bottom:5px;">
                        Chi tiết đơn hàng
                    </h3>

                    ${productListHtml}

                    <p>
                        Tổng thanh toán:
                        <strong>${order.totalprice.toLocaleString('vi-VN')}₫</strong>
                    </p>

                    <p>
                        Sau khi thanh toán thành công và được xác nhận,
                        đơn hàng sẽ được chuyển sang bước chuẩn bị giao hàng.
                    </p>

                    <hr style="border:none;border-top:1px solid #eee;">

                    <small>
                        Đây là email tự động, vui lòng không phản hồi.
                    </small>
                </div>`;
            break;

        case 'PAYMENT_CONFIRMED':
            subject = `[FootballGenZ] Thanh toán đã được xác nhận - Đơn hàng #${order.code}`;
            bodyHtml = ` <div style="font-family: sans-serif; line-height: 1.5; color: #333;"> <h2 style="color: #28a745;">Thanh toán thành công</h2>
                    <p>Chào <strong>${order.receiver}</strong>,</p>

                    <p>
                        Chúng tôi đã xác nhận khoản thanh toán cho đơn hàng
                        <strong>#${order.code}</strong>.
                    </p>

                    <div style="
                        background:#d4edda;
                        border-left:4px solid #28a745;
                        padding:12px;
                        margin:15px 0;
                    ">
                        ✅ Trạng thái hiện tại:
                        <strong>Đã xác nhận thanh toán</strong>
                    </div>

                    <h3 style="border-bottom:1px solid #ccc;padding-bottom:5px;">
                        Chi tiết đơn hàng
                    </h3>

                    ${productListHtml}

                    <p>
                        Tổng thanh toán:
                        <strong>${order.totalprice.toLocaleString('vi-VN')}₫</strong>
                    </p>

                    <p>
                        Đơn hàng của bạn hiện đã được chuyển sang bước xử lý và chuẩn bị giao hàng.
                    </p>

                    <p>
                        Chúng tôi sẽ tiếp tục gửi thông báo khi trạng thái đơn hàng thay đổi.
                    </p>

                    <hr style="border:none;border-top:1px solid #eee;">

                    <small>
                        Đây là email tự động, vui lòng không phản hồi.
                    </small>
                </div>`;
            break;
        case 'PAYMENT_SUBMITTED':
            subject = `[FootballGenZ] Đã nhận yêu cầu xác minh thanh toán - Đơn hàng #${order.code}`;
            bodyHtml = ` <div style="font-family: sans-serif; line-height: 1.5; color: #333;"> <h2 style="color: #fd7e14;">Đã nhận thông tin thanh toán</h2>

                    <p>Chào <strong>${order.receiver}</strong>,</p>

                    <p>
                        Chúng tôi đã nhận được minh chứng thanh toán cho đơn hàng
                        <strong>#${order.code}</strong>.
                    </p>

                    <p>
                        Nhân viên FootballGenZ sẽ tiến hành kiểm tra và xác nhận giao dịch
                        trong thời gian sớm nhất.
                    </p>

                    <div style="
                        background:#fff3cd;
                        border-left:4px solid #ffc107;
                        padding:12px;
                        margin:15px 0;
                    ">
                        ⏳ Trạng thái hiện tại:
                        <strong>Đang chờ xác nhận thanh toán</strong>
                    </div>

                    <h3 style="border-bottom:1px solid #ccc;padding-bottom:5px;">
                        Chi tiết đơn hàng
                    </h3>

                    ${productListHtml}

                    <p>
                        Tổng thanh toán:
                        <strong>${order.totalprice.toLocaleString('vi-VN')}₫</strong>
                    </p>

                    <p>
                        Sau khi xác nhận thành công, chúng tôi sẽ bắt đầu xử lý và chuẩn bị giao hàng.
                    </p>

                    <hr style="border:none;border-top:1px solid #eee;">

                    <small>
                        Đây là email tự động, vui lòng không phản hồi.
                    </small>
                </div>`;
            break;
        case 'PAYMENT_REJECTED':
            subject = `[FootballGenZ] Thanh toán chưa được chấp thuận - Đơn hàng #${order.code}`;
            bodyHtml = ` <div style="font-family: sans-serif; line-height: 1.5; color: #333;"> <h2 style="color: #dc3545;">Thanh toán chưa được chấp thuận</h2>

                    <p>Chào <strong>${order.receiver}</strong>,</p>

                    <p>
                        Chúng tôi đã kiểm tra minh chứng thanh toán cho đơn hàng
                        <strong>#${order.code}</strong>, tuy nhiên hiện tại chưa thể xác nhận giao dịch này.
                    </p>

                    <div style="
                        background:#f8d7da;
                        border-left:4px solid #dc3545;
                        padding:12px;
                        margin:15px 0;
                    ">
                        ❌ Trạng thái hiện tại:
                        <strong>Thanh toán bị từ chối</strong>
                    </div>

                    <div style="
                        background:#fff3cd;
                        border-left:4px solid #ffc107;
                        padding:12px;
                        margin:15px 0;
                    ">
                        <strong>Lý do từ chối:</strong><br>
                        ${order.rejectionReason || 'Thông tin thanh toán chưa khớp với đơn hàng.'}
                    </div>

                    <p>
                        Vui lòng kiểm tra lại giao dịch và gửi lại minh chứng thanh toán
                        từ trang chi tiết đơn hàng.
                    </p>

                    <h3 style="border-bottom:1px solid #ccc;padding-bottom:5px;">
                        Chi tiết đơn hàng
                    </h3>

                    ${productListHtml}

                    <p>
                        Tổng thanh toán:
                        <strong>${order.totalprice.toLocaleString('vi-VN')}₫</strong>
                    </p>

                    <p>
                        Sau khi gửi lại minh chứng, hệ thống sẽ chuyển yêu cầu đến quản trị viên
                        để kiểm tra và xác nhận lại.
                    </p>

                    <div style="
                        text-align:center;
                        margin-top:25px;
                    ">
                        <a
                            href="${process.env.CUSTOMER_URL || 'https://footballgenz.vn'}/order/confirm/${order.code}"
                            style="
                                display:inline-block;
                                background:#dc3545;
                                color:#fff;
                                text-decoration:none;
                                padding:12px 24px;
                                border-radius:6px;
                                font-weight:bold;
                            ">
                            Gửi lại minh chứng thanh toán
                        </a>
                    </div>

                    <hr style="border:none;border-top:1px solid #eee;margin-top:25px;">

                    <small>
                        Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ FootballGenZ để được hỗ trợ.
                    </small>

                    <br>

                    <small>
                        Đây là email tự động, vui lòng không phản hồi.
                    </small>
                </div>`;
            break;

        case 'SUCCESS':
            subject = `[FootballGenZ] Đặt hàng thành công - Đơn hàng #${order.code}`;
            bodyHtml = `
                <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                    <h2 style="color: #28a745;">Cảm ơn bạn đã đặt hàng!</h2>
                    <p>Chào <strong>${order.receiver}</strong>,</p>
                    <p>Đơn hàng <strong>#${order.code}</strong> của bạn đã được hệ thống tiếp nhận.</p>
                    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Chi tiết sản phẩm:</h3>
                    ${productListHtml}
                    <p>Tổng thanh toán: <strong>${order.totalprice.toLocaleString('vi-VN')}₫</strong></p>
                    <p>Chúng tôi sẽ xử lý đơn hàng sớm nhất có thể.</p>
                    <hr style="border: none; border-top: 1px solid #eee;">
                    <small>Đây là email tự động, vui lòng không phản hồi.</small>
                </div>`;
            break;

        case 'CANCELLED_TIMEOUT':
            subject = `[FootballGenZ] Đơn hàng #${order.code} đã bị hủy`;
            bodyHtml = `
                <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                    <h2 style="color: #d0021b;">Thông báo hủy đơn hàng tự động</h2>
                    <p>Chào <strong>${order.receiver}</strong>,</p>
                    <p>Rất tiếc, đơn hàng <strong>#${order.code}</strong> của bạn đã bị hủy do hệ thống không nhận được xác nhận thanh toán trong thời gian quy định (3-15 phút).</p>
                    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Các sản phẩm trong đơn đã hủy:</h3>
                    ${productListHtml}
                    <p>Số tiền: <strong>${order.totalprice.toLocaleString('vi-VN')}₫</strong></p>
                    <p>Nếu bạn đã chuyển khoản nhưng đơn hàng bị hủy, vui lòng liên hệ hotline <strong>0962 638 440</strong> để được hỗ trợ khôi phục.</p>
                    <p>Bạn có thể đặt lại đơn hàng mới bất cứ lúc nào tại website của chúng tôi.</p>
                    <hr style="border: none; border-top: 1px solid #eee;">
                    <p>Trân trọng,<br>Đội ngũ FootballGenZ</p>
                </div>`;
            break;

        case 'REJECTED':
            subject = `[FootballGenZ] Xác minh thanh toán thất bại - Đơn hàng #${order.code}`;
            bodyHtml = `
                <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                    <h2 style="color: #ffc107;">Xác minh thanh toán không thành công</h2>
                    <p>Chào bạn,</p>
                    <p>Hình ảnh minh chứng thanh toán cho đơn hàng <strong>#${order.code}</strong> không được chấp nhận.</p>
                    <p>Lý do: <i>${order.note.split('\n').pop()}</i></p>
                    <p>Vui lòng truy cập trang chi tiết đơn hàng để thực hiện gửi lại ảnh chính xác.</p>
                </div>`;
            break;
    }
    
    // Nếu bodyHtml rỗng, có nghĩa là email này không dùng template có sẵn,
    // mà nội dung đã được truyền trực tiếp vào hàm sendEmail.
    // Trong trường hợp này, subject và bodyHtml sẽ được lấy từ tham số truyền vào.
    if (!bodyHtml) {
        subject = passedSubject || (data && data.subject); // Lấy subject từ data nếu không có template
        bodyHtml = passedBodyHtml || (data && data.bodyHtml); // Lấy bodyHtml từ data nếu không có template
    }

    const mailOptions = {
        from: '"FootballGenZ Support" <' + process.env.EMAIL_USER + '>',
        to: recipient,
        subject: subject,
        html: bodyHtml
    };
    await transporter.sendMail(mailOptions);
};

/**
 * Hàm trợ giúp để gửi các email liên quan đến đơn hàng.
 * @param {Object} order - Thông tin đơn hàng
 * @param {String} type - Loại thông báo: 'SUCCESS', 'CANCELLED_TIMEOUT', 'REJECTED', 'ADMIN_NEW_ORDER'
 */
const sendOrderRelatedEmail = async (order, type) => {
    // Nếu gửi cho khách hàng thì cần email hợp lệ, nếu gửi cho Admin thì luôn cho phép
    const isCustomerType = ['ORDER_CREATED','PAYMENT_SUBMITTED','PAYMENT_CONFIRMED','SUCCESS', 'CANCELLED_TIMEOUT', 'REJECTED'].includes(type);
    
    if (isCustomerType && (!order.creator || order.creator === 'anonymous' || !order.creator.includes('@'))) {
        console.log(`[EMAIL] Bỏ qua gửi email ${type} cho đơn #${order.code}: Email khách hàng không hợp lệ.`);
        return;
    }

    let to;
    if (type === 'ADMIN_NEW_ORDER') {
        to = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    } else {
        to = order.creator;
    }

    // actualSendEmailLogic sẽ tự động tạo subject và bodyHtml dựa trên type và order
    // Chúng ta chỉ cần truyền các tham số cần thiết cho sendEmail
    await sendEmail(to, '', '', type, { order }); // subject và bodyHtml rỗng vì sẽ được tạo trong actualSendEmailLogic
};

module.exports = { sendEmail, sendOrderRelatedEmail, waitUntilRedisReady };
