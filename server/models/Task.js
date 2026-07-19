const mongoose = require('mongoose');
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      // 'Completed' is the terminal state a task reaches once one of its
      // submissions is approved (see submissionController.reviewSubmission).
      enum: ['Open', 'Claimed', 'Submitted', 'Approved', 'Rejected', 'Completed'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
