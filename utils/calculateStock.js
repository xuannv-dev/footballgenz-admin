function calculateStock(variants){

    if(!variants){

        return 0;

    }

    return variants.reduce(

        (sum, v) => sum + v.stock,

        0

    );

}

module.exports = calculateStock;