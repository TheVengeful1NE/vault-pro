# Vault Pro - Secure Data Storage System

A secure vault application for storing critical documents, passwords, and secret notes with a sci-fi inspired UI design based on the Galaxy Navigator System.

## Features

- **Secure Login**: Protected with password
- **Multiple Categories**: 
  - Documents
  - Passwords  
  - Secret Notes
- **Local File Storage**: Data stored in browser localStorage
- **Sci-Fi UI**: Inspired by Galaxy
- **CRUD Operations**: Create, Read, Update, Delete items
- **Responsive Design**: Works on different screen sizes

## Usage

1. Open `index.html` in a web browser
2. Enter password:
3. Click "AUTHENTICATE" to access the vault
4. Use the sidebar to navigate between categories
5. Click "ADD NEW ITEM" to create new entries
6. Use VIEW/EDIT/DELETE buttons on each item

## File Structure

```
Vault Pro/
├── index.html          # Main application file
├── vault.js           # JavaScript functionality
└── README.md          # This file
```

## Data Storage

- Data is stored in browser's localStorage
- Persistent across browser sessions
- Data format: JSON with items array
- Each item has: id, category, title, content, created, modified timestamps

## Security Features

- Password protection on entry
- No data transmitted over network
- Local storage only
- Session-based access

## Design Elements

- Starfield background animation
- Sci-fi color scheme (cyan, red, dark blues)
- Courier New monospace font
- Gradient backgrounds and glowing effects
- Responsive grid layout

## Browser Compatibility

- Modern browsers with localStorage support
- Chrome, Firefox, Safari, Edge
- No external dependencies required
