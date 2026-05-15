const express = require('express');

const router = express.Router();

const multer = require('multer');

const cloudinary = require('cloudinary').v2;

const streamifier = require('streamifier');

require('dotenv').config();


// ================= CLOUDINARY =================

cloudinary.config({

    cloud_name: process.env.CLOUDINARY_NAME,

    api_key: process.env.CLOUDINARY_KEY,

    api_secret: process.env.CLOUDINARY_SECRET

});


// ================= MULTER =================

const upload = multer({

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/webp'
        ];

        if (allowedTypes.includes(file.mimetype)) {

            cb(null, true);

        } else {

            cb(
                new Error('Chỉ cho phép upload ảnh!'),
                false
            );

        }

    }

});


// ================= TEST =================

router.get('/', function (req, res) {

    res.send('Upload route working');

});


// ================= UPLOAD IMAGE =================

router.post(
    '/',
    upload.single('file'),

    async function (req, res) {

        try {

            // 🔥 VALIDATE FILE

            if (!req.file) {

                return res
                    .status(400)
                    .send('File không hợp lệ');

            }

            // 🔥 CATEGORY FOLDER

            const group =
                req.body.group || 'common';

            // 🔥 UPLOAD STREAM

            const result =
                await uploadToCloudinary(
                    req.file.buffer,
                    group
                );

            // 🔥 RETURN URL

            res.send(result.secure_url);

        } catch (err) {

            console.log(err);

            res
                .status(500)
                .send('Upload failed');

        }

    }
);


// ================= HELPER =================

function uploadToCloudinary(buffer, group) {

    return new Promise((resolve, reject) => {

        const stream =
            cloudinary.uploader.upload_stream(

                {
                    folder:
                        `footballgenz/${group}`,

                    transformation: [
                        {
                            width: 800,
                            crop: 'scale'
                        }
                    ]
                },

                (error, result) => {

                    if (error) {

                        reject(error);

                    } else {

                        resolve(result);

                    }

                }

            );

        streamifier
            .createReadStream(buffer)
            .pipe(stream);

    });

}

module.exports = router;