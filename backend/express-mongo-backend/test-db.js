const { sequelize, testConnection } = require('./config/database');
const User = require('./models/User');
const Course = require('./models/Course');
const Assignment = require('./models/Assignment');

async function testDatabaseConnection() {
  try {
    console.log('Testing MySQL database connection...');

    // Test the connection
    await testConnection();

    console.log('✅ Connected to MySQL database successfully!');

    // Sync the models with the database
    await sequelize.sync({ force: true }); // Use force: true for testing (drops and recreates tables)
    console.log('✅ Database tables synchronized successfully');

    // Create a test user
    const testUser = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });
    console.log('✅ Test user created successfully');

    // Create a test course
    const testCourse = await Course.create({
      title: 'Test Course',
      code: 'TEST101',
      description: 'A test course',
      instructorId: testUser.id,
      department: 'Computer Science',
      credits: 3,
      semester: 'Fall',
      year: 2024
    });
    console.log('✅ Test course created successfully');

    // Create a test assignment
    const testAssignment = await Assignment.create({
      title: 'Test Assignment',
      description: 'A test assignment',
      courseId: testCourse.id,
      instructorId: testUser.id,
      type: 'Homework',
      totalPoints: 100,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });
    console.log('✅ Test assignment created successfully');

    // Test queries
    const users = await User.findAll();
    const courses = await Course.findAll({ include: User });
    const assignments = await Assignment.findAll({ include: [Course, User] });

    console.log(`✅ Found ${users.length} users, ${courses.length} courses, ${assignments.length} assignments`);

    // Clean up (optional for testing)
    // await sequelize.drop();

    console.log('✅ Database test completed successfully!');
    console.log('✅ All models and relationships working correctly!');

    process.exit(0);

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
