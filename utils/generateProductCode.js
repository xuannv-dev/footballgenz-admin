const Product = require('../models/product');

async function generateProductCode(group, brand) {

    // ================= GROUP PREFIX =================

    let groupPrefix = 'SP';

    switch (group) {

        case 'GIAY':
            groupPrefix = 'GIAY';
            break;

        case 'PHUKIEN':
            groupPrefix = 'PK';
            break;

        case 'QUANAO':
            groupPrefix = 'AO';
            break;

    }

    // ================= BRAND PREFIX =================

    let brandPrefix = 'GEN';

    switch (brand.toUpperCase()) {

        case 'ADIDAS':
            brandPrefix = 'ADI';
            break;

        case 'NIKE':
            brandPrefix = 'NIK';
            break;

        case 'PUMA':
            brandPrefix = 'PUM';
            break;

        case 'MIZUNO':
            brandPrefix = 'MIZ';
            break;

    }

    // ================= COUNT =================

    const count =
        await Product.countDocuments({
            group,
            brand
        });

    const number =
        String(count + 1)
            .padStart(3, '0');

    // ================= RESULT =================

    return `${groupPrefix}-${brandPrefix}-${number}`;

}

module.exports = generateProductCode;