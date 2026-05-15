const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// connect DB
mongoose.connect('mongodb://127.0.0.1:27017/footballgenz');

// model
const Product = require('../models/product');

// cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

// 🔥 FOLDER ẢNH LOCAL
const IMAGE_FOLDER = path.join(__dirname, '../public/assets/image/sanpham');

async function migrate() {
    const products = await Product.find();

    for (let product of products) {

        if (!product.images || !product.images.length) continue;

        let newImages = [];

        for (let img of product.images) {

            // nếu đã là cloudinary thì bỏ qua
            if (img.startsWith('http')) {
                newImages.push(img);
                continue;
            }

            try {
                const filePath = path.join(IMAGE_FOLDER, img);

                if (!fs.existsSync(filePath)) {
                    console.log("❌ Không tìm thấy:", filePath);
                    continue;
                }

                const result = await cloudinary.uploader.upload(filePath, {
                    folder: 'products'
                });

                console.log("✔ Upload:", img);

                newImages.push(result.secure_url);

            } catch (err) {
                console.log("❌ Lỗi upload:", img, err);
            }
        }

        product.images = newImages;
        await product.save();

        console.log("✅ Updated:", product.productCode);
    }

    console.log("🔥 DONE MIGRATE");
    process.exit();
}

migrate();