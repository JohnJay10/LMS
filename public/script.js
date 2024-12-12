const API_URL = 'http://localhost:3000/api/books';

document.addEventListener('DOMContentLoaded', fetchBooks);

async function fetchBooks() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    const bookList = document.getElementById('books');
    bookList.innerHTML = data.books.map(book => `<li>${book.title} by ${book.author}</li>`).join('');
  } catch (error) {
    console.error('Error fetching books:', error);
  }
}

document.getElementById('book-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value;
  const author = document.getElementById('author').value;

  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author }),
    });
    fetchBooks();
    e.target.reset();
  } catch (error) {
    console.error('Error adding book:', error);
  }
});
