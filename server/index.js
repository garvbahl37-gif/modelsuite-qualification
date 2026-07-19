require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const talentRoutes = require('./routes/talentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/talent', talentRoutes);
app.use('/api/submissions', submissionRoutes);

// Health check
app.get('/', (req, res) => res.send('Task Pipeline API is running...'));

// Only connect to the database and start listening when this file is run
// directly (`node index.js`). When it is required by the test suite the app is
// exported without side effects, so tests can point it at their own database.
if (require.main === module) {
  connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
