/**
 * Tạo tài khoản admin.
 * Chạy: node seed-admin.js
 * Xong rồi có thể xóa file này.
 */

require('dotenv').config();
require('./models/db');

const User   = require('./models/user');
const bcrypt = require('bcrypt');

const EMAIL    = 'admin@footballgenz.vn'; // đổi theo ý muốn
const PASSWORD = 'Admin@123';             // đổi theo ý muốn

async function seed() {

    const existed = await User.findOne({ email: EMAIL });

    if (existed) {
        console.log(`Tài khoản ${EMAIL} đã tồn tại.`);
        process.exit(0);
    }

    const hash = await bcrypt.hash(PASSWORD, 10);

    await User.create({
        email:     EMAIL,
        password:  hash,
        firstname: 'Admin',
        lastname:  'FootballGenz',
        role:      'ADMIN',
        isActive:  'true'
    });

    console.log(`✅ Tạo admin thành công!`);
    console.log(`   Email   : ${EMAIL}`);
    console.log(`   Password: ${PASSWORD}`);
    process.exit(0);

}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});