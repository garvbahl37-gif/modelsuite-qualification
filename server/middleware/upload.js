const multer = require('multer');
const path = require('path');

// Cap on how many files a single submission may carry (#21).
const MAX_FILES = 10;

// Store files locally on disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Add a random suffix so two files uploaded in the same millisecond
    // (common when selecting several files at once) never collide.
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB per file
    files: MAX_FILES,
  },
});

module.exports = upload;
