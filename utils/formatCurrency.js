function formatCurrency(number) {

    if (!number) return '0 ₫';

    return Number(number)
        .toLocaleString('vi-VN') + ' ₫';

}

module.exports = formatCurrency;