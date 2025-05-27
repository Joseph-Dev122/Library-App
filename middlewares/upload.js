import multer from 'multer';
import path from 'path';

// Allowed file types
const allowedBookTypes = ['.pdf', '.epub'];
const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store books and cover images in separate folders
    const folder = file.fieldname === 'bookFile' ? 'books' : 'covers';
    cb(null, `uploads/${folder}`);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.fieldname === 'bookFile') {
    allowedBookTypes.includes(ext) 
      ? cb(null, true) 
      : cb(new Error('Only PDF and EPUB files are allowed'), false);
  } 
  else if (file.fieldname === 'coverImage') {
    allowedImageTypes.includes(ext)
      ? cb(null, true)
      : cb(new Error('Only JPG, PNG, or WEBP images are allowed'), false);
  }
};

// Initialize multer with config
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max for books
  }
});

export default upload;