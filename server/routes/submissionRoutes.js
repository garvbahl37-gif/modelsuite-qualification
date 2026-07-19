const express = require('express');
const router = express.Router();
const { submitTask, getSubmission, getAllSubmissions, reviewSubmission } = require('../controllers/submissionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// ── Admin routes (defined FIRST — must come before /:taskId to avoid shadowing) ──
router.get('/admin/all', protect, adminOnly, getAllSubmissions);
router.put('/:id/review', protect, adminOnly, reviewSubmission);

// ── Talent routes ──
// Accept up to 10 files under the `files` field (#21). Multer's MAX_FILES
// limit is enforced in the upload middleware.
router.post('/:taskId', protect, upload.array('files', 10), submitTask);
router.get('/:taskId', protect, getSubmission);

module.exports = router;
