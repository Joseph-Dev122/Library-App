import express from 'express';
import { protect, adminOnly, developerOnly } from '../../middlewares/auth.js';
import { getBooks, uploadBook, getBookById, getStats, deleteBook, getBookContent} from '../controllers/bookController.js';
import upload from '../../middlewares/upload.js';


const router = express.Router();

// Handle multiple files (book + optional cover image)
router.post(
  '/',
  protect,
  developerOnly,
  upload.fields([
    { name: 'bookFile', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  uploadBook
);
router.get('/', protect, getBooks);

// Get single book (added for completeness)
router.get('/:id', protect, getBookById );

router.get('/:id/content', protect, getBookContent); // New route for fetching book content

// Delete a book (new route)
router.delete('/:id', protect,  deleteBook);

//  get all books and student stats 
router.get('/admin/stats', protect, adminOnly, getStats);

export default router;