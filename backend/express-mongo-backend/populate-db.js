const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Assignment = require('./models/Assignment');
const { connectDB } = require('./config/database');

async function populateDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Course.deleteMany({});
    await Assignment.deleteMany({});

    console.log('Creating sample admin...');
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@smartlearn.edu',
      password: 'admin123',
      role: 'admin',
      department: 'Administration',
      isActive: true
    });

    console.log('Creating sample faculty...');
    const faculty1 = await User.create({
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@smartlearn.edu',
      password: 'faculty123',
      role: 'faculty',
      department: 'Computer Science',
      employeeId: 'CS001',
      isActive: true
    });

    const faculty2 = await User.create({
      name: 'Prof. Michael Chen',
      email: 'michael.chen@smartlearn.edu',
      password: 'faculty123',
      role: 'faculty',
      department: 'Mathematics',
      employeeId: 'MATH001',
      isActive: true
    });

    console.log('Creating sample students...');
    const student1 = await User.create({
      name: 'Alice Smith',
      email: 'alice.smith@smartlearn.edu',
      password: 'student123',
      role: 'student',
      department: 'Computer Science',
      year: 3,
      isActive: true
    });

    const student2 = await User.create({
      name: 'Bob Johnson',
      email: 'bob.johnson@smartlearn.edu',
      password: 'student123',
      role: 'student',
      department: 'Mathematics',
      year: 2,
      isActive: true
    });

    const student3 = await User.create({
      name: 'Charlie Brown',
      email: 'charlie.brown@smartlearn.edu',
      password: 'student123',
      role: 'student',
      department: 'Computer Science',
      year: 4,
      isActive: true
    });

    console.log('Creating sample courses...');
    const course1 = await Course.create({
      title: 'Introduction to Programming',
      code: 'CS101',
      description: 'Basic programming concepts using Python',
      instructor: faculty1._id,
      department: 'Computer Science',
      credits: 3,
      semester: 'Fall',
      year: 2024,
      enrolledStudents: [
        { student: student1._id, enrolledAt: new Date() },
        { student: student3._id, enrolledAt: new Date() }
      ],
      isActive: true
    });

    const course2 = await Course.create({
      title: 'Calculus I',
      code: 'MATH101',
      description: 'Fundamental concepts of calculus',
      instructor: faculty2._id,
      department: 'Mathematics',
      credits: 4,
      semester: 'Fall',
      year: 2024,
      enrolledStudents: [
        { student: student2._id, enrolledAt: new Date() }
      ],
      isActive: true
    });

    console.log('Creating sample assignments...');
    const assignment1 = await Assignment.create({
      title: 'Hello World Program',
      description: 'Write a simple Python program that prints "Hello, World!"',
      courseId: course1._id,
      instructor: faculty1._id,
      type: 'Homework',
      totalPoints: 100,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true
    });

    const assignment2 = await Assignment.create({
      title: 'Limits and Continuity',
      description: 'Solve problems on limits and continuity',
      courseId: course2._id,
      instructor: faculty2._id,
      type: 'Homework',
      totalPoints: 50,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      isActive: true
    });

    console.log('✅ Database populated successfully!');
    console.log('Sample data created:');
    console.log(`- 1 Admin: ${admin.email}`);
    console.log(`- 2 Faculty: ${faculty1.email}, ${faculty2.email}`);
    console.log(`- 3 Students: ${student1.email}, ${student2.email}, ${student3.email}`);
    console.log(`- 2 Courses: ${course1.code}, ${course2.code}`);
    console.log(`- 2 Assignments: ${assignment1.title}, ${assignment2.title}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Database population failed:', error);
    process.exit(1);
  }
}

populateDatabase();
