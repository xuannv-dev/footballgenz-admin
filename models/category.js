const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    code: String,
    group: String,
    type: Array,
    image: String,
    isActive: Boolean
})

module.exports = mongoose.model('category',CategorySchema)