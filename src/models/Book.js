import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  author: { 
    type: String, 
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  genre: { 
    type: String,
    trim: true,
    enum: {
      values: ['Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 
               'Thriller', 'Romance', 'Biography', 'History', 'Self-Help', 'Other'],
      message: '{VALUE} is not a valid genre'
    }
  },
  year: {
    type: Number,
    required: [true, 'Publication year is required'],
    min: [1900, 'Year must be at least 1900'],
    max: [new Date().getFullYear(), 'Year cannot be in the future']
  },
  filePath: { 
    type: String,
    required: [true, 'File path is required'],
  },

  coverImagePath: { 
    type: String,
    required:[true, 'File path is required']
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true,
});

// Compound index for title+author uniqueness
bookSchema.index({ title: 1, author: 1 }, { unique: true });

// Text index for search
bookSchema.index({ title: 'text', author: 'text', genre: 'text' });

const Book = mongoose.model("Book", bookSchema);
export default Book;