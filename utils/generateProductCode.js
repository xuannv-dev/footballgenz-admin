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

        case 'AOCLB':
            groupPrefix = 'AOCLB';
            break;
        case 'AOQG':
            groupPrefix = 'AOQG';
            break;
        case 'AOTRAINING':
            groupPrefix = 'AOTRAINING';
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

    const products =
        await Product.find({
            group,
            brand
        })
        .select('productCode');

    let maxNumber = 0;

    products.forEach(p => {

        const parts =
            p.productCode.split('-');

        const current =
            parseInt(parts[2]);

        if(current > maxNumber){

            maxNumber = current;

        }

    });

    const nextNumber =
        String(maxNumber + 1)
            .padStart(3,'0');

    return `${groupPrefix}-${brandPrefix}-${nextNumber}`;

}

module.exports = generateProductCode;