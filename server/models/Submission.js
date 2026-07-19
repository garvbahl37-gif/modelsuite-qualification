const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    talentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Multi-file support (#21). Every uploaded file for this submission is
    // stored here. `fileUrl` is kept as a mirror of the first file so that any
    // older client/reader that still reads a single URL keeps working.
    fileUrls: {
      type: [String],
      default: [],
    },
    fileUrl: {
      type: String,
    },
    notes: {
      type: String,
    },
    // Submission history (#1): submissions are never overwritten. Each attempt
    // is a new document, and `attempt` records its 1-based order for the task.
    attempt: {
      type: Number,
      default: 1,
    },
    reviewStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', submissionSchema);
