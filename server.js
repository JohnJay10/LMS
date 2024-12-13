// Import necessary modules
const express = require('express');
const path = require('path'); // Add this to work with file paths
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { body, param, validationResult } = require('express-validator');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json'); // Adjust the path as needed


require('dotenv').config();

// Initialize the app and middleware
const app = express();
app.use(express.json());
app.use(helmet()); // Adds security headers
app.use(cors()); // Enables Cross-Origin Resource Sharing

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiter to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Define a Book schema
const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    isBorrowed: { type: Boolean, default: false }
}, { timestamps: true });

// Create a Book model
const Book = mongoose.model('Book', bookSchema);

// Middleware for validating request inputs
const validateInputs = (validations) => async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};


// Serve the welcome page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files (CSS, JS) from Swagger UI
app.use('/swagger-ui', express.static(path.join(__dirname, 'node_modules', 'swagger-ui-dist')));

app.use('/apidocs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// Routes

// Add a book
app.post('/books', 
    validateInputs([
        body('title').isString().notEmpty().withMessage('Title is required'),
        body('author').isString().notEmpty().withMessage('Author is required')
    ]),
    async (req, res) => {
        try {
            const { title, author } = req.body;
            const book = new Book({ title, author });
            await book.save();
            res.status(201).json({ message: 'Book added successfully', book });
        } catch (err) {
            res.status(500).json({ error: 'Failed to add book', details: err.message });
        }
    }
);

// Borrow a book
app.patch('/books/borrow/:id', 
    validateInputs([
        param('id').isMongoId().withMessage('Invalid book ID')
    ]),
    async (req, res) => {
        try {
            const book = await Book.findById(req.params.id);
            if (!book) {
                return res.status(404).json({ error: 'Book not found' });
            }
            if (book.isBorrowed) {
                return res.status(400).json({ error: 'Book is already borrowed' });
            }
            book.isBorrowed = true;
            await book.save();
            res.json({ message: 'Book borrowed successfully', book });
        } catch (err) {
            res.status(500).json({ error: 'Failed to borrow book', details: err.message });
        }
    }
);

// Return a book
app.patch('/books/return/:id', 
    validateInputs([
        param('id').isMongoId().withMessage('Invalid book ID')
    ]),
    async (req, res) => {
        try {
            const book = await Book.findById(req.params.id);
            if (!book) {
                return res.status(404).json({ error: 'Book not found' });
            }
            if (!book.isBorrowed) {
                return res.status(400).json({ error: 'Book was not borrowed' });
            }
            book.isBorrowed = false;
            await book.save();
            res.json({ message: 'Book returned successfully', book });
        } catch (err) {
            res.status(500).json({ error: 'Failed to return book', details: err.message });
        }
    }
);

// View all available books
app.get('/books', async (req, res) => {
    try {
        const books = await Book.find({ isBorrowed: false });
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve books', details: err.message });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
