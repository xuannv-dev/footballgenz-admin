const mongoose = require('mongoose');
const slugify = require('slugify');

const CategorySchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    group: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    type: {
        type: [String],
        required: true,
        default: []
    },
    description: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Tự động tạo slug từ tên danh mục (group) trước khi lưu
CategorySchema.pre('save', function(next) {
    if (this.isModified('group') && this.group) {
        this.slug = slugify(this.group, {
            lower: true,      // Chuyển thành chữ thường
            strict: true,     // Loại bỏ ký tự đặc biệt
            locale: 'vi'      // Hỗ trợ tiếng Việt tốt hơn
        });
    }
    next();
});

module.exports = mongoose.model('category', CategorySchema);