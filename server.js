// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(morgan('combined'));
app.use(helmet());
app.use(cors());

// Set PORT before using it
const PORT = process.env.PORT || 3000;

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
console.log(`API documentation available at http://localhost:${PORT}/api-docs`);

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Successfully connected to MongoDB'));


app.use(express.static('public'));

// Example route for the home page (optional if index.html is sufficient)
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Define the Book schema and model
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  isBorrowed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bookSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Book = mongoose.model('Book', bookSchema);

// Routes

/**
 * @route POST /books
 * @description Add a new book to the library
 * @access Public
 */
app.post('/books', async (req, res) => {
  try {
    const { title, author } = req.body;
    if (!title || !author) {
      return res.status(400).json({ message: 'Title and author are required.' });
    }
    const newBook = new Book({ title, author });
    await newBook.save();
    res.status(201).json({ message: 'Book added successfully.', book: newBook });
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

/**
 * @route PATCH /books/borrow/:id
 * @description Borrow a book from the library
 * @access Public
 */
app.patch('/books/borrow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    if (book.isBorrowed) {
      return res.status(400).json({ message: 'Book is already borrowed.' });
    }

    book.isBorrowed = true;
    await book.save();
    res.status(200).json({ message: 'Book borrowed successfully.', book });
  } catch (error) {
    console.error('Error borrowing book:', error);
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

/**
 * @route PATCH /books/return/:id
 * @description Return a borrowed book to the library
 * @access Public
 */
app.patch('/books/return/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    if (!book.isBorrowed) {
      return res.status(400).json({ message: 'Book is not currently borrowed.' });
    }

    book.isBorrowed = false;
    await book.save();
    res.status(200).json({ message: 'Book returned successfully.', book });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

/**
 * @route GET /books
 * @description View all available books in the library
 * @access Public
 */
app.get('/books', async (req, res) => {
  try {
    const books = await Book.find({ isBorrowed: false }).sort({ createdAt: -1 });
    res.status(200).json({ message: 'Available books retrieved successfully.', books });
  } catch (error) {
    console.error('Error retrieving books:', error);
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

/**
 * @route GET /books/all
 * @description View all books in the library (both borrowed and available)
 * @access Public
 */
app.get('/books/all', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.status(200).json({ message: 'All books retrieved successfully.', books });
  } catch (error) {
    console.error('Error retrieving all books:', error);
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// Error Handling Middleware
app.use((req, res, next) => {
  res.status(404).json({ message: 'Endpoint not found.' });
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(err.status || 500).json({
    message: 'An unexpected error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.'
  });
});

// Start the server

module.exports = app;