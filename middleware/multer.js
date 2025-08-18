
import multer from 'multer';
import { dirname, join, extname } from 'path';
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



// Career upload 
const careerPicStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, '../Uploads/career'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

export const uploadCareerPic = multer({
    storage: careerPicStorage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
});



// Career CV upload 
const careerCvStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, '../Uploads/careerCV'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});


export const uploadCareerCv = multer({
    storage: careerCvStorage,
    fileFilter: (req, file, cb) => {
        const allowedExtensions = /\.(jpe?g|png|pdf|doc|docx)$/i;
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        const extnameValid = allowedExtensions.test(extname(file.originalname).toLowerCase());
        const mimetypeValid = allowedMimeTypes.includes(file.mimetype.toLowerCase());

        if (extnameValid && mimetypeValid) {
            return cb(null, true);
        }
        cb(new Error('Only JPG, JPEG, PNG, PDF, DOC, and DOCX files are allowed'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});



// Multer setup for tour guide image upload
const tourGuideStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, '../Uploads/tourGuides'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

export const uploadTourGuideImage = multer({
    storage: tourGuideStorage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});







// Multer setup for tour guide image upload
const mediaGalleryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, '../Uploads/mediaGallery'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

export const uploadMediaGalleryImage = multer({
    storage: mediaGalleryStorage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});





// Multer setup Shop image upload
const shopImagesStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, '../Uploads/shopGallery'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

export const uploadShopImages = multer({ 
    storage: shopImagesStorage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});






// Multer setup for Blog image upload
const blogImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, '../Uploads/blogGallery'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

export const uploadBlogImage = multer({ 
    storage: blogImageStorage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});



