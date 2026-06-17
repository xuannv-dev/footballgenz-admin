const { Queue } = require('bullmq');
const IORedis = require('ioredis');

/**
 * Cấu hình kết nối Redis
 */
const connection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// Promise để chờ Redis sẵn sàng
const waitUntilRedisReady = new Promise((resolve, reject) => {
    if (connection.status === 'ready') {
        return resolve();
    }

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
    console.log('🚀 [REDIS ADMIN] Đang thiết lập kết nối tới Redis Cloud...');
});

connection.on('ready', () => {
    console.log('✅ [REDIS ADMIN] Kết nối thành công và đã sẵn sàng!');
});

connection.on('reconnecting', () => {
    console.warn('⚠️ [REDIS ADMIN] Mất kết nối! Đang thử kết nối lại...');
});

connection.on('close', () => {
    console.error('🚫 [REDIS ADMIN] Kết nối đã bị đóng.');
});

connection.on('error', (err) => {
    console.error('❌ [REDIS ADMIN ERROR] Lỗi kết nối:', err.message);
});

/**
 * Khởi tạo Hàng đợi (Queue)
 * Admin CHỈ KHỞI TẠO QUEUE để đẩy dữ liệu vào, KHÔNG KHỞI TẠO WORKER
 */
const emailQueue = new Queue('emailOrderQueue', { connection });

/**
 * PRODUCER: Hàm này được gọi từ các nơi khác trong Admin (vd: khi xác nhận thanh toán).
 * Nhiệm vụ duy nhất là ném Job vào Redis.
 */
const sendEmail = async (to, subject, bodyHtml, type = 'GENERIC', data = {}) => {
    if (!to || !to.includes('@')) {
        console.log(`[EMAIL ADMIN] Bỏ qua gửi email loại ${type}: Địa chỉ email người nhận không hợp lệ.`);
        return;
    }

    try {
        // Đảm bảo Redis đã kết nối
        await waitUntilRedisReady;

        if (connection.status !== 'ready') {
            throw new Error('Redis connection lost or not ready.');
        }

        const orderCode = (data && data.order) ? data.order.code : 'no-order';

        // Thêm job vào hàng đợi của Customer
        await emailQueue.add(`email-${orderCode}-${type}-${Date.now()}`, { to, subject, bodyHtml, type, data }, {
            attempts: 3, 
            backoff: {
                type: 'exponential',
                delay: 5000, 
            },
            removeOnComplete: true,
            removeOnFail: 1000 
        });
        
        console.log(`[EMAIL MQ ADMIN] Đã đưa lệnh gửi email loại ${type} tới ${to} vào hàng đợi Redis.`);
        
    } catch (error) {
        // Ở Admin, nếu Redis lỗi thì không gọi trực tiếp Nodemailer vì không có thư viện Nodemailer
        console.error(`[EMAIL MQ ADMIN ERROR] Lỗi Queue (${error.message}). Không thể đẩy Job gửi mail!`);
    }
};

/**
 * Hàm trợ giúp để gọi từ Router của Admin.
 * Bạn truyền tham số order và loại hành động (vd: PAYMENT_CONFIRMED, REJECTED) vào đây.
 */
const sendOrderRelatedEmail = async (order, type) => {
    const isCustomerType = ['ORDER_CREATED','PAYMENT_SUBMITTED','PAYMENT_CONFIRMED','SUCCESS', 'CANCELLED_TIMEOUT', 'REJECTED', 'PAYMENT_REJECTED', 'ORDER_PREPARING', 'ORDER_SHIPPING', 'ORDER_COMPLETED', 'ORDER_CANCELLED'].includes(type);
    
    if (isCustomerType && (!order.creator || order.creator === 'anonymous' || !order.creator.includes('@'))) {
        console.log(`[EMAIL ADMIN] Bỏ qua lệnh gửi mail ${type} cho đơn #${order.code}: Email khách không hợp lệ.`);
        return;
    }

    let to;
    if (type === 'ADMIN_NEW_ORDER') {
        // Phòng trường hợp Admin lại báo cho chính Admin, thường Admin ít gọi loại này
        to = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    } else {
        to = order.creator;
    }

    // Đẩy vào queue với template do Customer tự ráp
    await sendEmail(to, '', '', type, { order }); 
};

module.exports = { sendEmail, sendOrderRelatedEmail, waitUntilRedisReady };