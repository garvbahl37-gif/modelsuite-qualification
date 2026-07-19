const Submission = require('../models/Submission');
const Task = require('../models/Task');

// Build an absolute URL for an uploaded file from the incoming request, so
// links keep working regardless of the host/port the API is served from.
const buildFileUrl = (req, filename) =>
  `${req.protocol}://${req.get('host')}/uploads/${filename}`;

// @desc  Submit a task with one or more file uploads
// @route POST /api/submissions/:taskId
// @access Talent (protect middleware)
const submitTask = async (req, res) => {
  const { taskId } = req.params;
  const { notes } = req.body;

  try {
    // #21 — collect every uploaded file. `upload.array` populates req.files.
    const fileUrls = (req.files || []).map((file) => buildFileUrl(req, file.filename));

    // Backward compatibility: still accept a single fileUrl in the body when no
    // files were uploaded (e.g. a link-only submission from an older client).
    if (fileUrls.length === 0 && req.body.fileUrl) {
      fileUrls.push(req.body.fileUrl);
    }

    // #1 — never overwrite a previous submission. Every attempt is recorded as
    // its own document so no file or note is ever silently lost. `attempt` is
    // the 1-based order of this submission for the task/talent pair.
    const priorCount = await Submission.countDocuments({ taskId, talentId: req.user._id });

    const submission = await Submission.create({
      taskId,
      talentId: req.user._id,
      fileUrls,
      fileUrl: fileUrls[0] || null, // mirror first file for legacy readers
      notes,
      attempt: priorCount + 1,
    });

    // Move the task into the review queue.
    await Task.findByIdAndUpdate(taskId, { status: 'Submitted' });

    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get the latest submission for a specific task (admin use)
// @route GET /api/submissions/:taskId
// @access Protect only
const getSubmission = async (req, res) => {
  try {
    // With history preserved (#1) there may be several submissions; return the
    // most recent one.
    const submission = await Submission.findOne({ taskId: req.params.taskId })
      .sort({ createdAt: -1 })
      .populate('talentId', 'name email');

    if (!submission) {
      return res.status(404).json({ message: 'No submission found for this task' });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get ALL submissions (for Admin review queue)
// @route GET /api/submissions/admin/all
// @access Admin
const getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({})
      .populate('taskId', 'title dueDate status')
      .populate('talentId', 'name email')
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Approve or Reject a submission
// @route PUT /api/submissions/:id/review
// @access Admin
const reviewSubmission = async (req, res) => {
  const { reviewStatus } = req.body;

  // Validate the incoming decision — only Approved/Rejected are allowed.
  const ALLOWED = ['Approved', 'Rejected'];
  if (!ALLOWED.includes(reviewStatus)) {
    return res.status(400).json({
      message: "reviewStatus must be either 'Approved' or 'Rejected'",
    });
  }

  try {
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { reviewStatus },
      { new: true }
    )
      .populate('taskId', 'title status')
      .populate('talentId', 'name email');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // #8 — cascade the decision to the parent task. Approving completes the
    // task; rejecting moves it to the Rejected state.
    if (submission.taskId) {
      const taskStatus = reviewStatus === 'Approved' ? 'Completed' : 'Rejected';
      await Task.findByIdAndUpdate(submission.taskId._id, { status: taskStatus });
      // Reflect the new status on the populated object we return.
      submission.taskId.status = taskStatus;
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitTask, getSubmission, getAllSubmissions, reviewSubmission };
