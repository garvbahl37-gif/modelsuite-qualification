const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');

// #2 — a task may only ever be assigned to a user whose role is 'Talent'.
// Returns an error message string when the assignee is invalid, or null when
// the assignee is acceptable (including when there is no assignee at all).
const validateAssignee = async (assignedTo) => {
  if (!assignedTo) return null; // unassigned is fine
  // A malformed id must produce a clean 400, not a Mongoose CastError -> 500.
  if (!mongoose.Types.ObjectId.isValid(assignedTo)) return 'Assigned user not found';
  const assignee = await User.findById(assignedTo);
  if (!assignee) return 'Assigned user not found';
  if (assignee.role !== 'Talent') {
    return 'Tasks can only be assigned to users with the Talent role';
  }
  return null;
};

// @desc  Get all tasks
// @route GET /api/tasks
// @access Admin
const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find({})
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get single task
// @route GET /api/tasks/:id
// @access Admin
const getTaskById = async (req, res) => {
  try {
    // — will throw a CastError from Mongoose instead of a clean 400
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a task
// @route POST /api/tasks
// @access Admin
const createTask = async (req, res) => {
  const { title, description, status, assignedTo, dueDate } = req.body;

  try {
    const assigneeError = await validateAssignee(assignedTo);
    if (assigneeError) return res.status(400).json({ message: assigneeError });

    const task = await Task.create({
      title,
      description,
      status,
      assignedTo: assignedTo || null,
      dueDate,
      createdBy: req.user._id,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update a task
// @route PUT /api/tasks/:id
// @access Admin
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // #2 — validate the assignee whenever the update touches assignedTo.
    if (Object.prototype.hasOwnProperty.call(req.body, 'assignedTo')) {
      const assigneeError = await validateAssignee(req.body.assignedTo);
      if (assigneeError) return res.status(400).json({ message: assigneeError });
    }

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    ).populate('assignedTo', 'name email');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a task
// @route DELETE /api/tasks/:id
// @access Admin
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    // — orphaned Submission documents remain in DB after task deletion
    await Task.findByIdAndDelete(req.params.id);

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask };
