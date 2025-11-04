const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/database');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
const User = require('./models/User');

async function initializeDB() {
  try {
    await connectDB();

    // Seed test user for development
    await seedTestUser();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

async function seedTestUser() {
  try {
    const existingUser = await User.findOne({ email: 'admin@test.com' });
    if (!existingUser) {
      const testUser = new User({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'password123', // Will be hashed by the pre-save hook
        role: 'admin'
      });
      await testUser.save();
      console.log('✅ Test user seeded: admin@test.com / password123');
    } else {
      console.log('✅ Test user already exists');
    }
  } catch (error) {
    console.error('Error seeding test user:', error);
  }
}

initializeDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/users', require('./routes/users'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
