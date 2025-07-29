
import multer from 'multer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Profile picture upload (single file)
const profilePicStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, '../Uploads/profiles'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

export const uploadProfilePic = multer({
    storage: profilePicStorage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
});

// Gallery upload (multiple files, max 8)
const galleryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, '../Uploads/gallery'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

export const uploadGallery = multer({
    storage: galleryStorage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
    // limits: { files: 8 }, // Restrict to 8 files for gallery
});
