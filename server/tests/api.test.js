// Integration tests for the bug fixes and feature added in this PR.
//
//   #1  submissions preserve full history (never overwritten)
//   #2  tasks cannot be assigned to Admin users
//   #8  approving a submission cascades the parent task to 'Completed'
//   #21 submissions accept multiple files
//
// The suite spins up an in-memory MongoDB (mongodb-memory-server), points
// Mongoose at it, and drives the real Express app through supertest. No
// external database or running server is required.

const { before, after, beforeEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Must be set before the app (and its JWT helpers) are required.
process.env.JWT_SECRET = 'test-secret-for-api-suite';

const app = require('../index');
const User = require('../models/User');
const Task = require('../models/Task');
const Submission = require('../models/Submission');

let mongod;

// Register a user through the real auth route and return { token, id }.
const registerUser = async (name, email, role) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'password123', role });
  assert.equal(res.status, 201, `register ${email} failed: ${res.text}`);
  return { token: res.body.token, id: res.body._id };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  // Remove any files the upload tests wrote to disk.
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  for (const entry of fs.readdirSync(uploadsDir)) {
    if (entry !== '.gitkeep') fs.rmSync(path.join(uploadsDir, entry));
  }
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Task.deleteMany({}), Submission.deleteMany({})]);
});

describe('#2 — task assignment role guard', () => {
  it('rejects assigning a task to an Admin user (create)', async () => {
    const admin = await registerUser('Admin One', 'admin1@test.com', 'Admin');
    const admin2 = await registerUser('Admin Two', 'admin2@test.com', 'Admin');

    const res = await request(app)
      .post('/api/tasks')
      .set(auth(admin.token))
      .send({ title: 'Task', status: 'Open', assignedTo: admin2.id });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Talent/);
  });

  it('allows assigning a task to a Talent user (create)', async () => {
    const admin = await registerUser('Admin One', 'admin1@test.com', 'Admin');
    const talent = await registerUser('Talent One', 'talent1@test.com', 'Talent');

    const res = await request(app)
      .post('/api/tasks')
      .set(auth(admin.token))
      .send({ title: 'Task', status: 'Open', assignedTo: talent.id });

    assert.equal(res.status, 201);
    assert.equal(String(res.body.assignedTo), String(talent.id));
  });

  it('allows creating an unassigned task', async () => {
    const admin = await registerUser('Admin One', 'admin1@test.com', 'Admin');
    const res = await request(app)
      .post('/api/tasks')
      .set(auth(admin.token))
      .send({ title: 'Task', status: 'Open' });
    assert.equal(res.status, 201);
  });

  it('returns 400 when the assignee does not exist', async () => {
    const admin = await registerUser('Admin One', 'admin1@test.com', 'Admin');
    const res = await request(app)
      .post('/api/tasks')
      .set(auth(admin.token))
      .send({ title: 'Task', status: 'Open', assignedTo: new mongoose.Types.ObjectId() });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /not found/i);
  });

  it('rejects re-assigning an existing task to an Admin (update)', async () => {
    const admin = await registerUser('Admin One', 'admin1@test.com', 'Admin');
    const admin2 = await registerUser('Admin Two', 'admin2@test.com', 'Admin');
    const talent = await registerUser('Talent One', 'talent1@test.com', 'Talent');

    const created = await request(app)
      .post('/api/tasks')
      .set(auth(admin.token))
      .send({ title: 'Task', status: 'Open', assignedTo: talent.id });

    const res = await request(app)
      .put(`/api/tasks/${created.body._id}`)
      .set(auth(admin.token))
      .send({ assignedTo: admin2.id });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Talent/);
  });
});

describe('#8 — approval cascades to the parent task', () => {
  const setupSubmission = async () => {
    const admin = await registerUser('Admin One', 'admin1@test.com', 'Admin');
    const talent = await registerUser('Talent One', 'talent1@test.com', 'Talent');
    const task = await request(app)
      .post('/api/tasks')
      .set(auth(admin.token))
      .send({ title: 'Cascade Task', status: 'Open', assignedTo: talent.id });
    const submission = await request(app)
      .post(`/api/submissions/${task.body._id}`)
      .set(auth(talent.token))
      .field('notes', 'done');
    return { admin, talent, taskId: task.body._id, submissionId: submission.body._id };
  };

  it("sets the task to 'Completed' when a submission is approved", async () => {
    const { admin, taskId, submissionId } = await setupSubmission();
    const res = await request(app)
      .put(`/api/submissions/${submissionId}/review`)
      .set(auth(admin.token))
      .send({ reviewStatus: 'Approved' });

    assert.equal(res.status, 200);
    assert.equal(res.body.reviewStatus, 'Approved');
    const task = await Task.findById(taskId);
    assert.equal(task.status, 'Completed');
  });

  it("sets the task to 'Rejected' when a submission is rejected", async () => {
    const { admin, taskId, submissionId } = await setupSubmission();
    await request(app)
      .put(`/api/submissions/${submissionId}/review`)
      .set(auth(admin.token))
      .send({ reviewStatus: 'Rejected' });

    const task = await Task.findById(taskId);
    assert.equal(task.status, 'Rejected');
  });

  it('rejects an invalid reviewStatus value', async () => {
    const { admin, submissionId } = await setupSubmission();
    const res = await request(app)
      .put(`/api/submissions/${submissionId}/review`)
      .set(auth(admin.token))
      .send({ reviewStatus: 'Maybe' });
    assert.equal(res.status, 400);
  });
});

describe('#1 — submissions preserve history', () => {
  it('creates a new record on every submission instead of overwriting', async () => {
    const admin = await registerUser('Admin One', 'admin1@test.com', 'Admin');
    const talent = await registerUser('Talent One', 'talent1@test.com', 'Talent');
    const task = await request(app)
      .post('/api/tasks')
      .set(auth(admin.token))
      .send({ title: 'History Task', status: 'Open', assignedTo: talent.id });

    const first = await request(app)
      .post(`/api/submissions/${task.body._id}`)
      .set(auth(talent.token))
      .field('notes', 'first attempt');
    const second = await request(app)
      .post(`/api/submissions/${task.body._id}`)
      .set(auth(talent.token))
      .field('notes', 'second attempt');

    assert.equal(first.body.attempt, 1);
    assert.equal(second.body.attempt, 2);
    assert.notEqual(first.body._id, second.body._id);

    const all = await Submission.find({ taskId: task.body._id }).sort({ attempt: 1 });
    assert.equal(all.length, 2);
    assert.equal(all[0].notes, 'first attempt');
    assert.equal(all[1].notes, 'second attempt');
  });
});

describe('#21 — multi-file submissions', () => {
  it('stores every uploaded file in fileUrls', async () => {
    const admin = await registerUser('Admin One', 'admin1@test.com', 'Admin');
    const talent = await registerUser('Talent One', 'talent1@test.com', 'Talent');
    const task = await request(app)
      .post('/api/tasks')
      .set(auth(admin.token))
      .send({ title: 'Upload Task', status: 'Open', assignedTo: talent.id });

    const res = await request(app)
      .post(`/api/submissions/${task.body._id}`)
      .set(auth(talent.token))
      .field('notes', 'two files')
      .attach('files', Buffer.from('file one contents'), 'one.txt')
      .attach('files', Buffer.from('file two contents'), 'two.pdf');

    assert.equal(res.status, 201);
    assert.equal(res.body.fileUrls.length, 2);
    // Legacy single-file mirror points at the first file.
    assert.equal(res.body.fileUrl, res.body.fileUrls[0]);
  });
});
