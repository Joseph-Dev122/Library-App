import Book from '../models/Book.js';
import fs from 'fs/promises'; // Using promises API for better async handling
import { createReadStream } from 'node:fs';
import { access, constants, stat } from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..','..','uploads'); // Points to the 'uploads' folder

export const getBookContent = async (req, res) => {
    try {
        console.log('Request received for book ID:', req.params.id);
        
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.error('Invalid ID format:', req.params.id);
            return res.status(400).json({ 
                error: 'Invalid book ID format',
                receivedId: req.params.id
            });
        }

        const book = await Book.findById(req.params.id);
        if (!book) {
            console.error('Book not found in database for ID:', req.params.id);
            return res.status(404).json({ 
                error: 'Book not found',
                searchedId: req.params.id
            });
        }

        const fullPath = path.join(UPLOADS_DIR, book.filePath);
        console.log('Looking for file at:', fullPath);

        try {
            await access(fullPath, constants.R_OK);
            console.log('File exists and is readable');
        } catch (err) {
            console.error('File access error:', {
                path: fullPath,
                error: err.message
            });
            return res.status(404).json({ 
                error: 'Book file not found on server',
                expectedPath: fullPath
            });
        }

        const stats = await stat(fullPath);
        if (stats.size === 0) {
            console.error('File is empty:', fullPath);
            throw new Error('File is empty');
        }


        //     // Enhanced headers
     res.setHeader('Content-Type', 'application/epub+zip');
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length');

        const stream = createReadStream(fullPath);
        
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });

        stream.pipe(res);

    } catch (error) {
        console.error('Controller error:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Failed to retrieve book content',
                details: error.message
            });
        }
    }
};




export const uploadBook = async (req, res) => {
    let bookFile, coverImage;

    try {
        // Validate required fields
        const { title, author, description, genre, year } = req.body;
        if (!title || !author || !genre || !year) {
            throw new Error('Missing required fields');
        }

        if (!req.files?.bookFile || !req.files?.coverImage) {
            throw new Error('Both Book file and cover image are required');
        }

        bookFile = req.files.bookFile[0];
        coverImage = req.files.coverImage[0];

        // Create database record
       // In uploadBook controller
const newBook = new Book({
  title,
  author,
  description,
  genre,
  year: parseInt(year),
  filePath: path.join('books', bookFile.filename), // Consistent path joining
  coverImagePath: path.join('covers', coverImage.filename), // Consistent path joining
  uploadedBy: req.user._id,
});

        // Save to database
        const savedBook = await newBook.save();

        // Respond with created book data (excluding sensitive info)
        res.status(201).json({
            _id: savedBook._id,
            title: savedBook.title,
            author: savedBook.author,
            genre: savedBook.genre,
            coverImagePath: savedBook.coverImage,
            year: savedBook.year,
            createdAt: savedBook.createdAt,
        });
    } catch (err) {
        // Cleanup uploaded files if error occurred
        try {
            if (bookFile) {
                await fs.unlink(path.join(UPLOADS_DIR, bookFile.path));
            }
            if (coverImage) {
                await fs.unlink(path.join(UPLOADS_DIR, coverImage.path));
            }
        } catch (cleanupErr) {
            console.error('Error during file cleanup:', cleanupErr);
        }

        // Error response
        const statusCode = err.name === 'ValidationError' ? 400 : 500;
        res.status(statusCode).json({
            error: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        });
    }
};





export const getBooks = async (req, res) => {
    try {
        // Add pagination, filtering, and sorting
        const { page = 1, limit = 10, genre, sort = '-createdAt' } = req.query;

        const filter = {};
        if (genre) filter.genre = genre;

        const books = await Book.find(filter)
            .populate('uploadedBy', 'name email role')
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .select('-filePath'); // Exclude filePath from response

        // Get total count for pagination info
        const total = await Book.countDocuments(filter);

        res.json({
            data: books,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).json({
            error: 'Error fetching books',
            ...(process.env.NODE_ENV === 'development' && { details: err.message }),
        });
    }
};





export const getBookById = async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid book ID format' });
      }
  
      const book = await Book.findById(req.params.id)
        .populate('uploadedBy', 'name email role')
        .lean(); // Using .lean() to get a plain JS object
  
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
  
      // Get base URL from environment or use default
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  
      // Create response data - no need for toObject() since we used .lean()
      const responseData = {
        ...book,
        filePath: `${baseUrl}/uploads/books/${path.basename(book.filePath)}`,
        secureUrl: `${baseUrl}/api/books/${req.params.id}/content`
      };
  
      res.json({
        success: true,
        data: responseData
      });
  
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        error: 'Server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };





export const deleteBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({
                success: false,
                error: 'Book not found',
            });
        }

        // Check if the user has permission to delete (admin/developer)
        // This is already handled by the developerOnly middleware

        // Delete associated files
        if (book.filePath) {
            await fs.unlink(path.join(UPLOADS_DIR, book.filePath)).catch((err) =>
                console.error('Error deleting book file:', err)
            );
        }

        if (book.coverImagePath) {
            await fs.unlink(path.join(UPLOADS_DIR, book.coverImagePath)).catch((err) =>
                console.error('Error deleting cover image:', err)
            );
        }

        // Delete from database
        await Book.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Book deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete book',
            ...(process.env.NODE_ENV === 'development' && { details: error.message }),
        });
    }
};




export const getStats = async (req, res) => {
    try {
        // Book statistics
        const [totalBooks, recentBooks] = await Promise.all([
            Book.countDocuments(),
            Book.find().sort('-createdAt').limit(5).select('title author coverImagePath createdAt'),
        ]);

        // Student statistics
        const studentStats = await User.aggregate([
            {
                $match: { role: 'student' },
            },
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    newThisMonth: [
                        {
                            $match: {
                                createdAt: {
                                    $gte: new Date(new Date().setDate(1)),
                                    $lte: new Date(),
                                },
                            },
                        },
                        { $count: 'count' },
                    ],
                },
            },
        ]);

        // Transform aggregation results
        const response = {
            books: {
                total: totalBooks,
                recent: recentBooks,
            },
            students: {
                total: studentStats[0]?.total[0]?.count || 0,
                newThisMonth: studentStats[0]?.newThisMonth[0]?.count || 0,
            },
            lastUpdated: new Date(),
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            error: 'Error fetching statistics',
            books: { total: 0, recent: [] },
            students: { total: 0, newThisMonth: 0 },
        });
    }
};